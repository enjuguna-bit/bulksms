import { runQuery } from '../database/core';

export interface QueuedSMS {
    id?: number;
    to_number: string;
    body: string;
    timestamp: number;
    status?: string;
    retryCount?: number;
    sim_slot?: number;
}

/**
 * Add a new SMS to the queue.
 */
export async function enqueueMessage(to: string, body: string): Promise<void> {
    const sql = 'INSERT INTO sms_queue (to_number, body, timestamp) VALUES (?, ?, ?)';
    await runQuery(sql, [to, body, Date.now()]);
}

/**
 * Get all pending messages from the queue.
 */
export async function getPendingMessages(): Promise<QueuedSMS[]> {
    const result = await runQuery(
        "SELECT * FROM sms_queue WHERE status = 'pending' ORDER BY timestamp ASC"
    );
    return result.rows.raw();
}

/**
 * Mark a message as successfully sent.
 */
export async function markMessageSent(id: number): Promise<void> {
    await runQuery("UPDATE sms_queue SET status = 'sent' WHERE id = ?", [id]);
}

/**
 * Mark a message as failed and increment retry count.
 */
export async function markMessageFailed(id: number): Promise<void> {
    await runQuery(
        "UPDATE sms_queue SET status = 'failed', retryCount = retryCount + 1 WHERE id = ?",
        [id]
    );
}

/**
 * Remove a message from the queue completely.
 */
export async function removeMessage(id: number): Promise<void> {
    await runQuery('DELETE FROM sms_queue WHERE id = ?', [id]);
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<{ pending: number; failed: number; total: number }> {
    const totalResult = await runQuery('SELECT COUNT(*) as count FROM sms_queue');
    const pendingResult = await runQuery("SELECT COUNT(*) as count FROM sms_queue WHERE status = 'pending'");
    const failedResult = await runQuery("SELECT COUNT(*) as count FROM sms_queue WHERE status = 'failed'");

    return {
        total: totalResult.rows.item(0).count,
        pending: pendingResult.rows.item(0).count,
        failed: failedResult.rows.item(0).count
    };
}

/**
 * Clear all sent messages from the queue.
 */
export async function clearSentMessages(): Promise<void> {
    await runQuery("DELETE FROM sms_queue WHERE status = 'sent'");
}
