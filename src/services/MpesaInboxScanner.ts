// ------------------------------------------------------
// 📱 src/services/MpesaInboxScanner.ts
// Scans device SMS inbox for M-PESA transactions
// Uses native SmsReaderModule for efficient scanning
// ------------------------------------------------------

import { Platform } from 'react-native';
import { smsReader } from '@/native';
import {
    parseMpesaMessage,
    isMpesaMessage,
    type ParsedMpesaTransaction,
    getMpesaSummary,
    type MpesaSummary,
} from '@/utils/parseMpesaEnhanced';
import {
    bulkInsertMpesaTransactions,
    getMpesaTransactions,
    getUniqueContacts,
    getMpesaStats,
    type UniqueContact,
} from '@/db/repositories/mpesaTransactions';
import Logger from '@/utils/logger';

// ------------------------------------------------------
// Types
// ------------------------------------------------------

export interface ScanResult {
    /** Parsed M-PESA transactions */
    transactions: ParsedMpesaTransaction[];
    /** Total SMS messages scanned */
    totalScanned: number;
    /** Number of M-PESA messages found */
    mpesaFound: number;
    /** Number of duplicates skipped */
    duplicatesSkipped: number;
    /** Number of new transactions saved */
    newSaved: number;
    /** Summary statistics */
    summary: MpesaSummary;
}

export interface ScanProgress {
    current: number;
    total: number;
    phase: 'reading' | 'parsing' | 'saving';
}

type ProgressCallback = (progress: ScanProgress) => void;

// ------------------------------------------------------
// Main Scanner
// ------------------------------------------------------

/**
 * Scan device SMS inbox for M-PESA transactions.
 * Parses messages, deduplicates, and optionally saves to database.
 * 
 * @param options Configuration options
 * @returns Scan results with parsed transactions
 */
export async function scanMpesaInbox(options?: {
    /** Maximum messages to scan (default: 500) */
    limit?: number;
    /** Save to database (default: true) */
    saveToDb?: boolean;
    /** Progress callback */
    onProgress?: ProgressCallback;
}): Promise<ScanResult> {
    const limit = options?.limit ?? 500;
    const saveToDb = options?.saveToDb ?? true;
    const onProgress = options?.onProgress;

    Logger.info('MpesaScanner', `Starting inbox scan (limit: ${limit})`);

    if (Platform.OS !== 'android') {
        Logger.warn('MpesaScanner', 'Not available on this platform');
        return emptyResult();
    }

    try {
        // Phase 1: Read SMS from device
        onProgress?.({ current: 0, total: 100, phase: 'reading' });

        // Try M-PESA specific endpoint first (more efficient)
        let messages = await smsReader.getMpesaMessages(limit);

        // If no M-PESA messages found, fall back to all messages
        if (messages.length === 0) {
            Logger.debug('MpesaScanner', 'No M-PESA messages from native, falling back to getAll');
            const allMessages = await smsReader.getAll(limit);
            messages = allMessages
                .filter(msg => isMpesaMessage(msg.body))
                .map(msg => ({
                    body: msg.body,
                    address: msg.address,
                    timestamp: msg.timestamp,
                })) as any;
        }

        const totalScanned = messages.length;
        Logger.debug('MpesaScanner', `Read ${totalScanned} messages from inbox`);

        onProgress?.({ current: 30, total: 100, phase: 'parsing' });

        // Phase 2: Parse M-PESA messages
        const transactions: ParsedMpesaTransaction[] = [];
        const seenRefs = new Set<string>();

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const body = typeof msg === 'string' ? msg : msg.body;

            if (!isMpesaMessage(body)) continue;

            const parsed = parseMpesaMessage(body);
            if (!parsed || !parsed.reference) continue;

            // Deduplicate by reference
            if (seenRefs.has(parsed.reference)) continue;
            seenRefs.add(parsed.reference);

            transactions.push(parsed);

            // Report progress
            if (i % 50 === 0) {
                onProgress?.({
                    current: 30 + Math.floor((i / messages.length) * 40),
                    total: 100,
                    phase: 'parsing',
                });
            }
        }

        const mpesaFound = transactions.length;
        Logger.info('MpesaScanner', `Parsed ${mpesaFound} M-PESA transactions`);

        onProgress?.({ current: 70, total: 100, phase: 'saving' });

        // Phase 3: Save to database
        let newSaved = 0;
        let duplicatesSkipped = 0;

        if (saveToDb && transactions.length > 0) {
            const result = await bulkInsertMpesaTransactions(transactions);
            newSaved = result.inserted;
            duplicatesSkipped = result.skipped;
            Logger.info('MpesaScanner', `Saved ${newSaved} new, skipped ${duplicatesSkipped} duplicates`);
        }

        onProgress?.({ current: 100, total: 100, phase: 'saving' });

        // Generate summary
        const summary = getMpesaSummary(transactions);

        return {
            transactions,
            totalScanned,
            mpesaFound,
            duplicatesSkipped,
            newSaved,
            summary,
        };
    } catch (error) {
        Logger.error('MpesaScanner', 'Scan failed', error);
        return emptyResult();
    }
}

/**
 * Quick scan that only returns count without full parsing.
 * Useful for UI indicators.
 */
export async function quickScanCount(): Promise<number> {
    if (Platform.OS !== 'android') return 0;

    try {
        const messages = await smsReader.getMpesaMessages(100);
        return messages.length;
    } catch (error) {
        Logger.warn('MpesaScanner', 'Quick scan failed', error);
        return 0;
    }
}

/**
 * Get saved transactions from database.
 */
export async function getSavedTransactions(limit?: number): Promise<ParsedMpesaTransaction[]> {
    const rows = await getMpesaTransactions({ limit });

    return rows.map(row => ({
        name: row.name,
        phone: row.phone || '',
        amount: row.amount,
        reference: row.reference,
        date: row.date_iso,
        type: row.type,
        balance: row.balance,
        paybill: row.paybill,
        till: row.till,
        account: row.account,
        rawMessage: row.raw_message,
    }));
}

/**
 * Get unique contacts from saved transactions.
 */
export async function getMpesaContacts(): Promise<UniqueContact[]> {
    return getUniqueContacts();
}

/**
 * Get transaction statistics.
 */
export async function getTransactionStats() {
    return getMpesaStats();
}

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

function emptyResult(): ScanResult {
    return {
        transactions: [],
        totalScanned: 0,
        mpesaFound: 0,
        duplicatesSkipped: 0,
        newSaved: 0,
        summary: {
            totalTransactions: 0,
            totalReceived: 0,
            totalSent: 0,
            totalAmount: 0,
            uniqueContacts: 0,
            byType: {
                RECEIVED: 0,
                SENT: 0,
                PAYBILL: 0,
                BUYGOODS: 0,
                DEPOSIT: 0,
                WITHDRAW: 0,
                AIRTIME: 0,
                FULIZA: 0,
                UNKNOWN: 0,
            },
        },
    };
}
