import { runQuery } from '../database/core';

export interface StoredSmsMessage {
    id?: number;
    body: string;
    receivedAt: number;
}

/**
 * Add a new incoming SMS to the buffer.
 */
export async function addIncomingSms(body: string): Promise<void> {
    await runQuery(
        'INSERT INTO incoming_sms_buffer (body, receivedAt) VALUES (?, ?)',
        [body, Date.now()]
    );
}

/**
 * Get incoming SMS messages, newest first.
 */
export async function getIncomingSms(limit: number = 100): Promise<StoredSmsMessage[]> {
    const result = await runQuery(
        'SELECT * FROM incoming_sms_buffer ORDER BY receivedAt DESC LIMIT ?',
        [limit]
    );
    return result.rows.raw();
}

/**
 * Search incoming SMS by keyword.
 */
export async function searchIncomingSms(keyword: string): Promise<StoredSmsMessage[]> {
    const pattern = `%${keyword}%`;
    const result = await runQuery(
        'SELECT * FROM incoming_sms_buffer WHERE body LIKE ? ORDER BY receivedAt DESC',
        [pattern]
    );
    return result.rows.raw();
}

/**
 * Clear all incoming SMS messages.
 */
export async function clearIncomingSms(): Promise<void> {
    await runQuery('DELETE FROM incoming_sms_buffer');
}

/**
 * Keep only the most recent N messages, delete the rest.
 */
export async function pruneOldIncomingSms(maxCount: number): Promise<number> {
    const result = await runQuery(`
    DELETE FROM incoming_sms_buffer 
    WHERE id NOT IN (
      SELECT id FROM incoming_sms_buffer ORDER BY receivedAt DESC LIMIT ?
    )
  `, [maxCount]);
    return result.rowsAffected || 0;
}

/**
 * Get count of incoming SMS messages.
 */
export async function getIncomingSmsCount(): Promise<number> {
    const result = await runQuery('SELECT COUNT(*) as count FROM incoming_sms_buffer');
    return result.rows.item(0).count;
}
