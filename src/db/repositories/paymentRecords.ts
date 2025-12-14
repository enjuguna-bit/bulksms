import { runQuery } from '../database/core';

export interface CustomerRecord {
    id?: number;
    phone: string;
    name: string;
    rawMessage: string;
    type: string;
    lastSeen: number;
    transactionCount: number;
    validationScore?: number; // 0-100 authenticity score
    flags?: string[]; // e.g., ["SUSPICIOUS", "DUPLICATE_AMOUNT"]
}

/**
 * Insert or update a payment record with validation.
 * If phone exists, increments transaction count and updates data.
 * Now tracks validation scores and flags for data quality.
 */
export async function upsertPaymentRecord(record: CustomerRecord): Promise<void> {
    const validationScore = record.validationScore ?? 100;
    const flags = record.flags ? JSON.stringify(record.flags) : null;

    const sql = `
    INSERT INTO payment_records (phone, name, rawMessage, type, lastSeen, transactionCount, validationScore, flags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name = excluded.name,
      rawMessage = excluded.rawMessage,
      type = excluded.type,
      lastSeen = excluded.lastSeen,
      transactionCount = transactionCount + 1,
      validationScore = CASE 
        WHEN excluded.validationScore < validationScore THEN excluded.validationScore
        ELSE validationScore
      END,
      flags = COALESCE(excluded.flags, flags)
  `;
    await runQuery(sql, [
        record.phone,
        record.name,
        record.rawMessage,
        record.type,
        record.lastSeen,
        record.transactionCount,
        validationScore,
        flags
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

/**
 * Get records with low validation scores (suspicious transactions).
 */
export async function getSuspiciousRecords(minScore: number = 70): Promise<CustomerRecord[]> {
    const sql = `
    SELECT * FROM payment_records 
    WHERE validationScore < ? OR flags IS NOT NULL
    ORDER BY validationScore ASC, lastSeen DESC
  `;
    const result = await runQuery(sql, [minScore]);
    return result.rows.raw();
}

/**
 * Get records by validation score range (for analytics).
 */
export async function getRecordsByValidationScore(minScore: number, maxScore: number): Promise<CustomerRecord[]> {
    const sql = `
    SELECT * FROM payment_records 
    WHERE validationScore BETWEEN ? AND ?
    ORDER BY validationScore DESC, lastSeen DESC
  `;
    const result = await runQuery(sql, [minScore, maxScore]);
    return result.rows.raw();
}

/**
 * Flag a record with additional metadata.
 */
export async function flagRecord(phone: string, flags: string[]): Promise<void> {
    const flagsJson = JSON.stringify(flags);
    const sql = `
    UPDATE payment_records 
    SET flags = COALESCE(flags, '[]')
    WHERE phone = ?
  `;
    await runQuery(sql, [phone]);

    // If record exists, update flags
    const updateSql = `
    UPDATE payment_records 
    SET flags = ?
    WHERE phone = ?
  `;
    await runQuery(updateSql, [flagsJson, phone]);
}

/**
 * Get duplicate phone records (for deduplication review).
 */
export async function getDuplicatePhoneRecords(): Promise<Array<{ phone: string; count: number }>> {
    const sql = `
    SELECT phone, COUNT(*) as count 
    FROM payment_records 
    GROUP BY phone 
    HAVING count > 1
    ORDER BY count DESC
  `;
    const result = await runQuery(sql, []);
    return result.rows.raw();
}

/**
 * Get transaction summary (total amount, count, average).
 */
export async function getTransactionSummary(): Promise<{
    totalRecords: number;
    totalTransactions: number;
    averageTransactionsPerRecord: number;
    lowestScore: number;
}> {
    const sql = `
    SELECT 
      COUNT(*) as totalRecords,
      SUM(transactionCount) as totalTransactions,
      AVG(transactionCount) as avgTransactions,
      MIN(validationScore) as lowestScore
    FROM payment_records
  `;
    const result = await runQuery(sql, []);
    const row = result.rows.raw()[0];

    return {
        totalRecords: row?.totalRecords ?? 0,
        totalTransactions: row?.totalTransactions ?? 0,
        averageTransactionsPerRecord: row?.avgTransactions ?? 0,
        lowestScore: row?.lowestScore ?? 100,
    };
}

/**
 * Delete record by phone number.
 */
export async function deleteRecordByPhone(phone: string): Promise<void> {
    await runQuery('DELETE FROM payment_records WHERE phone = ?', [phone]);
}

/**
 * Get record by phone number.
 */
export async function getRecordByPhone(phone: string): Promise<CustomerRecord | null> {
    const sql = 'SELECT * FROM payment_records WHERE phone = ? LIMIT 1';
    const result = await runQuery(sql, [phone]);
    const records = result.rows.raw();
    return records.length > 0 ? records[0] : null;
}
