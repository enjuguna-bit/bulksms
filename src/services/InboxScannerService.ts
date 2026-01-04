
import { runQuery, runSingle, bulkInsert } from '@/db/database/core';
import { smsReader } from '@/native';
import { parseMobileMoneyMessage, ParsedMobileMoney } from '@/utils/mpesaParser';
import Logger from '@/utils/logger';

export interface ParsedTransaction {
    id: number;
    messageId?: number;
    provider: string; // 'MPESA', 'AIRTEL', 'BANK'
    type: 'INCOMING' | 'OUTGOING' | 'UNKNOWN';
    amount: number;
    partyName: string;
    partyPhone: string;
    timestamp: number;
    rawBody: string;
    createdAt: number;
}

export class InboxScannerService {

    /**
     * Scan device inbox for financial messages and import them.
     * @param limit Max messages to scan (default 500 for performance)
     * @param onProgress Callback for progress updates
     */
    static async scanInboxAndImport(
        limit = 500,
        onProgress?: (count: number, total: number) => void
    ): Promise<{ added: number; skipped: number; errors: number }> {
        Logger.info('InboxScanner', `Starting inbox scan (limit: ${limit})`);

        let added = 0;
        let skipped = 0;
        let errors = 0;

        try {
            // 1. Fetch messages from native inbox
            // Native getAll takes only limit, filtering must be done in JS or via specific native definition update
            // We'll fetch and filter in JS for now as checking native definitions shows no selection support in wrapper
            const messages = await smsReader.getAll(limit);

            Logger.info('InboxScanner', `Fetched ${messages.length} messages, filtering for financial...`);

            const transactions: any[][] = [];
            const now = Date.now();

            // Keywords to filter relevant messages
            const keywords = ['confirmed', 'received', 'paid to'];

            // 2. Process each message
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                if (onProgress) onProgress(i + 1, messages.length);

                try {
                    // Manual filter since native selection arg wasn't supported in wrapper
                    const bodyLower = msg.body.toLowerCase();
                    if (!keywords.some(k => bodyLower.includes(k))) {
                        continue;
                    }

                    // Deduplication check (simple check by raw body & timestamp approximation)
                    // Ideally we should use message_id mapping, but native IDs change.
                    // We'll use a simplified check on the parsed data later or just insert and ignore duplicates if we had constraints.
                    // For now, let's parse first.

                    const parsed = parseMobileMoneyMessage(msg.body);
                    if (!parsed || parsed.type === 'UNKNOWN') {
                        skipped++;
                        continue;
                    }

                    // Check if exists in DB (to prevent duplicates on re-scan)
                    // We check by (timestamp + amount + type) as a rough signature
                    // msg.timestamp is used
                    const exists = await this.checkTransactionExists(msg.timestamp, parsed.amount, parsed.type);
                    if (exists) {
                        skipped++;
                        continue;
                    }

                    // Prepare for bulk insert
                    transactions.push([
                        null, // message_id (optional link to local DB msg if we had one)
                        parsed.channel,
                        parsed.type,
                        parsed.amount,
                        parsed.name,
                        parsed.phone,
                        msg.timestamp,
                        msg.body,
                        now
                    ]);

                    added++;
                } catch (e) {
                    errors++;
                }
            }

            // 3. Batch Insert
            if (transactions.length > 0) {
                await bulkInsert(
                    'parsed_transactions',
                    ['message_id', 'provider', 'type', 'amount', 'party_name', 'party_phone', 'timestamp', 'raw_body', 'created_at'],
                    transactions
                );
            }

            return { added, skipped, errors };

        } catch (e) {
            Logger.error('InboxScanner', 'Scan failed', e);
            throw e;
        }
    }

    /**
     * Process a single real-time message
     */
    static async processRealTimeMessage(body: string, address: string, timestamp: number): Promise<boolean> {
        const parsed = parseMobileMoneyMessage(body);

        if (!parsed || parsed.type === 'UNKNOWN') {
            return false;
        }

        Logger.info('InboxScanner', `Detected financial SMS: ${parsed.channel} ${parsed.amount}`);

        // Insert immediately
        await runQuery(
            `INSERT INTO parsed_transactions 
            (provider, type, amount, party_name, party_phone, timestamp, raw_body, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                parsed.channel,
                parsed.type,
                parsed.amount,
                parsed.name,
                parsed.phone,
                timestamp,
                body,
                Date.now()
            ]
        );

        return true;
    }

    /**
     * Check if a transaction likely exists already
     */
    private static async checkTransactionExists(timestamp: number, amount: number, type: string): Promise<boolean> {
        // Allow a small time window variance (duplicates usually have exact same SMS time though)
        const result = await runQuery(
            `SELECT id FROM parsed_transactions 
             WHERE timestamp = ? AND amount = ? AND type = ? 
             LIMIT 1`,
            [timestamp, amount, type]
        );
        return result.rows.length > 0;
    }

    /**
     * Get transaction stats
     */
    static async getStats(): Promise<{ totalIncome: number; totalExpense: number; count: number }> {
        const result = await runQuery(`
            SELECT 
                SUM(CASE WHEN type = 'INCOMING' THEN amount ELSE 0 END) as totalIncome,
                SUM(CASE WHEN type = 'OUTGOING' THEN amount ELSE 0 END) as totalExpense,
                COUNT(*) as count
            FROM parsed_transactions
        `);

        const row = result.rows.raw()[0];
        return {
            totalIncome: row?.totalIncome || 0,
            totalExpense: row?.totalExpense || 0,
            count: row?.count || 0
        };
    }

    /**
     * Get recent transactions
     */
    static async getRecentTransactions(limit = 20): Promise<ParsedTransaction[]> {
        const result = await runQuery(`
            SELECT 
                id, message_id as messageId, provider, type, amount, 
                party_name as partyName, party_phone as partyPhone, 
                timestamp, raw_body as rawBody, created_at as createdAt
            FROM parsed_transactions
            ORDER BY timestamp DESC
            LIMIT ?
        `, [limit]);

        return result.rows.raw() as ParsedTransaction[];
    }
}
