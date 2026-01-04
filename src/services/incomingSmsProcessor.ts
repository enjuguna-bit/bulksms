// ============================================================================
// 📥 incomingSmsProcessor.ts — High-Volume Inbound SMS Buffer Processor
// P2 FIX: Handles high-volume inbound SMS during campaigns with buffering
// ============================================================================

import { runQuery } from '@/db/database/core';
import { syncMessageFromNative } from '@/db/messaging';
import Logger from '@/utils/logger';

export interface BufferedSms {
    id: number;
    body: string;
    receivedAt: number;
    address?: string;
}

/**
 * Add an SMS to the incoming buffer for batch processing.
 * This prevents UI freezes during high-volume campaigns.
 */
export async function bufferIncomingSms(body: string, address?: string): Promise<void> {
    await runQuery(
        `INSERT INTO incoming_sms_buffer (body, receivedAt, address) VALUES (?, ?, ?)`,
        [body, Date.now(), address || null]
    );
}

/**
 * Get buffered SMS messages for processing.
 * 
 * @param limit - Maximum messages to retrieve (default: 50)
 * @returns Array of buffered SMS messages
 */
export async function getBufferedMessages(limit: number = 50): Promise<BufferedSms[]> {
    const result = await runQuery(
        `SELECT * FROM incoming_sms_buffer ORDER BY receivedAt ASC LIMIT ?`,
        [limit]
    );
    return result.rows.raw();
}

/**
 * Remove a processed message from the buffer.
 */
export async function removeBufferedMessage(id: number): Promise<void> {
    await runQuery(
        `DELETE FROM incoming_sms_buffer WHERE id = ?`,
        [id]
    );
}

/**
 * Get buffer statistics.
 */
export async function getBufferStats(): Promise<{ pending: number; oldest: number | null }> {
    const countResult = await runQuery(
        `SELECT COUNT(*) as count FROM incoming_sms_buffer`
    );
    const oldestResult = await runQuery(
        `SELECT MIN(receivedAt) as oldest FROM incoming_sms_buffer`
    );

    return {
        pending: countResult.rows.item(0)?.count || 0,
        oldest: oldestResult.rows.item(0)?.oldest || null
    };
}

/**
 * Process buffered SMS messages in batches.
 * This should be called periodically or when the app becomes idle.
 * 
 * @param batchSize - Number of messages to process per batch
 * @param processor - Optional custom processor function
 * @returns Number of messages processed
 */
export async function processBufferedMessages(
    batchSize: number = 10,
    processor?: (msg: BufferedSms) => Promise<void>
): Promise<number> {
    try {
        const messages = await getBufferedMessages(batchSize);

        if (messages.length === 0) {
            return 0;
        }

        const stats = await getBufferStats();
        Logger.info('SmsProcessor', `Processing ${messages.length} buffered messages (Pending: ${stats.pending}, Oldest: ${stats.oldest})`);

        let processed = 0;

        for (const msg of messages) {
            try {
                if (processor) {
                    await processor(msg);
                } else {
                    // Default processing: Insert into new messaging schema
                    if (msg.address) {
                        await syncMessageFromNative(
                            msg.address,
                            msg.body,
                            'incoming',
                            msg.receivedAt
                        );
                        Logger.debug('SmsProcessor', `Synced message from ${msg.address} to new schema`);
                    } else {
                        Logger.warn('SmsProcessor', `Skipping message without address: ${msg.body.substring(0, 50)}...`);
                    }
                }

                await removeBufferedMessage(msg.id);
                processed++;

                // Yield to event loop every 5 messages to keep UI responsive
                if (processed % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            } catch (err) {
                Logger.error('SmsProcessor', `Failed to process message ${msg.id}`, err);
                // Don't remove failed messages - they'll be retried
            }
        }

        return processed;
    } catch (error) {
        Logger.error('SmsProcessor', 'Buffer processing failed', error);
        throw error;
    }
}

/**
 * Clear old buffered messages that are stuck.
 * 
 * @param maxAgeMins - Maximum age in minutes before a message is considered stuck
 * @returns Number of messages cleared
 */
export async function clearStuckMessages(maxAgeMins: number = 60): Promise<number> {
    const cutoff = Date.now() - (maxAgeMins * 60 * 1000);
    const result = await runQuery(
        `DELETE FROM incoming_sms_buffer WHERE receivedAt < ?`,
        [cutoff]
    );
    return result.rowsAffected || 0;
}

/**
 * Schedule periodic buffer processing.
 * Should be called on app startup.
 * 
 * @param intervalMs - How often to process buffer (default: 5 seconds)
 * @returns Cleanup function to stop the scheduler
 */
export function scheduleBufferProcessing(intervalMs: number = 5000): () => void {
    const intervalId = setInterval(() => {
        processBufferedMessages().catch(err =>
            Logger.error('SmsProcessor', 'Scheduled processing failed', err)
        );
    }, intervalMs);

    return () => clearInterval(intervalId);
}
