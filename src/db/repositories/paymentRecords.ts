import { runQuery } from '../database/core';

export interface CustomerRecord {
    id?: number;
    phone: string;
    name: string;
    rawMessage: string;
    type: string;
    lastSeen: number;
    transactionCount: number;
}

/**
 * Insert or update a payment record.
 * If phone exists, increments transaction count and updates data.
 */
export async function upsertPaymentRecord(record: CustomerRecord): Promise<void> {
    const sql = `
    INSERT INTO payment_records (phone, name, rawMessage, type, lastSeen, transactionCount)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name = excluded.name,
      rawMessage = excluded.rawMessage,
      type = excluded.type,
      lastSeen = excluded.lastSeen,
      transactionCount = transactionCount + 1
  `;
    await runQuery(sql, [
        record.phone,
        record.name,
        record.rawMessage,
        record.type,
        record.lastSeen,
        record.transactionCount
    ]);
}

/**
 * Get all payment records, optionally filtered by max age.
 */
export async function getPaymentRecords(maxAge?: number): Promise<CustomerRecord[]> {
    let sql = 'SELECT * FROM payment_records';
    const params: any[] = [];

    if (maxAge) {
        sql += ' WHERE lastSeen > ?';
        params.push(Date.now() - maxAge);
    }

    sql += ' ORDER BY transactionCount DESC, lastSeen DESC';

    const result = await runQuery(sql, params);
    return result.rows.raw();
}

/**
 * Delete payment records older than maxAge milliseconds.
 */
export async function clearOldPaymentRecords(maxAge: number): Promise<void> {
    const cutoff = Date.now() - maxAge;
    await runQuery('DELETE FROM payment_records WHERE lastSeen < ?', [cutoff]);
}

/**
 * Search payment records by keyword (phone or name).
 */
export async function searchPaymentRecords(keyword: string): Promise<CustomerRecord[]> {
    const pattern = `%${keyword}%`;
    const sql = `
    SELECT * FROM payment_records 
    WHERE phone LIKE ? OR name LIKE ?
    ORDER BY transactionCount DESC, lastSeen DESC
  `;
    const result = await runQuery(sql, [pattern, pattern]);
    return result.rows.raw();
}
