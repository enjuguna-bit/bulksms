// ------------------------------------------------------
// 📦 src/db/repositories/mpesaTransactions.ts
// SQLite repository for M-PESA transactions
// Stores parsed transactions with deduplication by reference
// ------------------------------------------------------

import { runQuery } from '../database/core';
import type { ParsedMpesaTransaction, MpesaTransactionType } from '@/utils/parseMpesaEnhanced';
import Logger from '@/utils/logger';

// ------------------------------------------------------
// Types
// ------------------------------------------------------

export interface MpesaTransactionRow {
    id: number;
    reference: string;
    name: string;
    phone: string;
    amount: number;
    type: MpesaTransactionType;
    date_iso: string;
    paybill?: string;
    till?: string;
    account?: string;
    balance?: number;
    raw_message: string;
    created_at: number;
    synced: boolean;
}

export interface UniqueContact {
    name: string;
    phone: string;
    totalAmount: number;
    transactionCount: number;
    lastSeen: string;
}

// ------------------------------------------------------
// Schema Migration
// ------------------------------------------------------

let tableCreated = false;

async function ensureTable(): Promise<void> {
    if (tableCreated) return;

    try {
        await runQuery(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date_iso TEXT NOT NULL,
        paybill TEXT,
        till TEXT,
        account TEXT,
        balance REAL,
        raw_message TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

        // Indexes for performance
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_mpesa_tx_reference ON mpesa_transactions(reference);`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_mpesa_tx_phone ON mpesa_transactions(phone);`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_mpesa_tx_type ON mpesa_transactions(type);`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_mpesa_tx_date ON mpesa_transactions(date_iso);`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_mpesa_tx_created ON mpesa_transactions(created_at);`);

        tableCreated = true;
        Logger.info('MpesaTransactions', 'Table initialized');
    } catch (error) {
        Logger.error('MpesaTransactions', 'Failed to create table', error);
        throw error;
    }
}

// ------------------------------------------------------
// CRUD Operations
// ------------------------------------------------------

/**
 * Insert or update an M-PESA transaction.
 * Uses reference as unique key to prevent duplicates.
 */
export async function upsertMpesaTransaction(tx: ParsedMpesaTransaction): Promise<number> {
    await ensureTable();

    const now = Date.now();

    const sql = `
    INSERT INTO mpesa_transactions (
      reference, name, phone, amount, type, date_iso, 
      paybill, till, account, balance, raw_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(reference) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      amount = excluded.amount,
      type = excluded.type,
      date_iso = excluded.date_iso,
      paybill = excluded.paybill,
      till = excluded.till,
      account = excluded.account,
      balance = excluded.balance;
  `;

    const params = [
        tx.reference,
        tx.name,
        tx.phone || null,
        tx.amount,
        tx.type,
        tx.date,
        tx.paybill || null,
        tx.till || null,
        tx.account || null,
        tx.balance || null,
        tx.rawMessage,
        now,
    ];

    const result = await runQuery(sql, params);
    return result.insertId || 0;
}

/**
 * Bulk insert transactions with deduplication.
 * Returns count of new transactions inserted.
 */
export async function bulkInsertMpesaTransactions(
    transactions: ParsedMpesaTransaction[]
): Promise<{ inserted: number; skipped: number }> {
    await ensureTable();

    let inserted = 0;
    let skipped = 0;

    for (const tx of transactions) {
        try {
            // Check if already exists
            const existing = await getMpesaTransactionByRef(tx.reference);
            if (existing) {
                skipped++;
                continue;
            }

            await upsertMpesaTransaction(tx);
            inserted++;
        } catch (error) {
            Logger.warn('MpesaTransactions', `Failed to insert ${tx.reference}`, error);
            skipped++;
        }
    }

    return { inserted, skipped };
}

/**
 * Get a single transaction by reference code.
 */
export async function getMpesaTransactionByRef(ref: string): Promise<MpesaTransactionRow | null> {
    await ensureTable();

    const result = await runQuery(
        'SELECT * FROM mpesa_transactions WHERE reference = ?',
        [ref]
    );

    if (result.rows.length === 0) return null;
    return result.rows.item(0) as MpesaTransactionRow;
}

/**
 * Get all transactions with optional filters.
 */
export async function getMpesaTransactions(options?: {
    limit?: number;
    offset?: number;
    type?: MpesaTransactionType;
    phone?: string;
    startDate?: string;
    endDate?: string;
}): Promise<MpesaTransactionRow[]> {
    await ensureTable();

    let sql = 'SELECT * FROM mpesa_transactions WHERE 1=1';
    const params: any[] = [];

    if (options?.type) {
        sql += ' AND type = ?';
        params.push(options.type);
    }

    if (options?.phone) {
        sql += ' AND phone = ?';
        params.push(options.phone);
    }

    if (options?.startDate) {
        sql += ' AND date_iso >= ?';
        params.push(options.startDate);
    }

    if (options?.endDate) {
        sql += ' AND date_iso <= ?';
        params.push(options.endDate);
    }

    sql += ' ORDER BY date_iso DESC';

    if (options?.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
    }

    if (options?.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
    }

    const result = await runQuery(sql, params);
    return result.rows.raw() as MpesaTransactionRow[];
}

/**
 * Get unique contacts extracted from transactions.
 * Aggregates by phone number with total amounts.
 */
export async function getUniqueContacts(): Promise<UniqueContact[]> {
    await ensureTable();

    const sql = `
    SELECT 
      name,
      phone,
      SUM(amount) as totalAmount,
      COUNT(*) as transactionCount,
      MAX(date_iso) as lastSeen
    FROM mpesa_transactions
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    ORDER BY transactionCount DESC, totalAmount DESC;
  `;

    const result = await runQuery(sql);
    return result.rows.raw() as UniqueContact[];
}

/**
 * Get transaction statistics.
 */
export async function getMpesaStats(): Promise<{
    totalTransactions: number;
    totalReceived: number;
    totalSent: number;
    uniquePhones: number;
    byType: Record<string, number>;
}> {
    await ensureTable();

    const total = await runQuery('SELECT COUNT(*) as count FROM mpesa_transactions');
    const totalTransactions = total.rows.item(0).count;

    const received = await runQuery(
        "SELECT SUM(amount) as sum FROM mpesa_transactions WHERE type IN ('RECEIVED', 'DEPOSIT')"
    );
    const totalReceived = received.rows.item(0).sum || 0;

    const sent = await runQuery(
        "SELECT SUM(amount) as sum FROM mpesa_transactions WHERE type NOT IN ('RECEIVED', 'DEPOSIT')"
    );
    const totalSent = sent.rows.item(0).sum || 0;

    const phones = await runQuery(
        "SELECT COUNT(DISTINCT phone) as count FROM mpesa_transactions WHERE phone IS NOT NULL AND phone != ''"
    );
    const uniquePhones = phones.rows.item(0).count;

    const types = await runQuery(
        'SELECT type, COUNT(*) as count FROM mpesa_transactions GROUP BY type'
    );
    const byType: Record<string, number> = {};
    for (let i = 0; i < types.rows.length; i++) {
        const row = types.rows.item(i);
        byType[row.type] = row.count;
    }

    return {
        totalTransactions,
        totalReceived,
        totalSent,
        uniquePhones,
        byType,
    };
}

/**
 * Delete old transactions (cleanup).
 */
export async function deleteOldTransactions(olderThanDays: number): Promise<number> {
    await ensureTable();

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const result = await runQuery(
        'DELETE FROM mpesa_transactions WHERE created_at < ?',
        [cutoff]
    );

    return result.rowsAffected || 0;
}

/**
 * Check if a transaction reference already exists.
 */
export async function transactionExists(reference: string): Promise<boolean> {
    await ensureTable();

    const result = await runQuery(
        'SELECT 1 FROM mpesa_transactions WHERE reference = ? LIMIT 1',
        [reference]
    );

    return result.rows.length > 0;
}

/**
 * Get all transactions for export.
 */
export async function getAllTransactionsForExport(): Promise<ParsedMpesaTransaction[]> {
    await ensureTable();

    const result = await runQuery(
        'SELECT * FROM mpesa_transactions ORDER BY date_iso DESC'
    );

    return result.rows.raw().map((row: MpesaTransactionRow) => ({
        name: row.name,
        phone: row.phone || '',
        amount: row.amount,
        reference: row.reference,
        date: row.date_iso,
        type: row.type as MpesaTransactionType,
        balance: row.balance,
        paybill: row.paybill,
        till: row.till,
        account: row.account,
        rawMessage: row.raw_message,
    }));
}
