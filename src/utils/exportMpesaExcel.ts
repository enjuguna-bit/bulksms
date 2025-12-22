// ------------------------------------------------------
// 📊 src/utils/exportMpesaExcel.ts
// Excel export for M-PESA transactions
// Generates .xlsx files with formatted data
// ------------------------------------------------------

import * as XLSX from 'xlsx';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import type { ParsedMpesaTransaction } from './parseMpesaEnhanced';
import Logger from './logger';

// ------------------------------------------------------
// Types
// ------------------------------------------------------

export interface ExportOptions {
    /** Custom filename (without extension) */
    filename?: string;
    /** Include raw message column */
    includeRawMessage?: boolean;
    /** Group by type with subtotals */
    groupByType?: boolean;
}

export interface ExportResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

// ------------------------------------------------------
// Main Export Function
// ------------------------------------------------------

/**
 * Export M-PESA transactions to Excel (.xlsx) file.
 * 
 * @param transactions Array of parsed transactions
 * @param options Export options
 * @returns Export result with file path
 */
export async function exportMpesaTransactionsToExcel(
    transactions: ParsedMpesaTransaction[],
    options?: ExportOptions
): Promise<ExportResult> {
    try {
        if (!transactions || transactions.length === 0) {
            return { success: false, error: 'No transactions to export' };
        }

        const filename = options?.filename || `MpesaTransactions_${formatDateForFilename(new Date())}`;
        const includeRaw = options?.includeRawMessage ?? false;

        Logger.info('ExportExcel', `Exporting ${transactions.length} transactions`);

        // Create workbook
        const wb = XLSX.utils.book_new();

        // --- Main Transactions Sheet ---
        const mainData = transactions.map((tx, index) => {
            const row: Record<string, any> = {
                '#': index + 1,
                'Name': tx.name,
                'Phone': tx.phone || '-',
                'Amount (KES)': tx.amount,
                'Reference': tx.reference,
                'Date': formatDate(tx.date),
                'Type': tx.type,
            };

            // Optional fields
            if (tx.paybill) row['PayBill'] = tx.paybill;
            if (tx.till) row['Till'] = tx.till;
            if (tx.account) row['Account'] = tx.account;
            if (tx.balance !== undefined) row['Balance'] = tx.balance;
            if (includeRaw) row['Raw Message'] = tx.rawMessage;

            return row;
        });

        const wsMain = XLSX.utils.json_to_sheet(mainData);

        // Set column widths
        const colWidths = [
            { wch: 5 },   // #
            { wch: 25 },  // Name
            { wch: 15 },  // Phone
            { wch: 15 },  // Amount
            { wch: 12 },  // Reference
            { wch: 12 },  // Date
            { wch: 12 },  // Type
        ];
        if (includeRaw) colWidths.push({ wch: 50 }); // Raw Message
        wsMain['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, wsMain, 'Transactions');

        // --- Summary Sheet ---
        const summary = calculateSummary(transactions);
        const summaryData = [
            { 'Metric': 'Total Transactions', 'Value': summary.totalCount },
            { 'Metric': 'Total Received (KES)', 'Value': summary.totalReceived },
            { 'Metric': 'Total Sent (KES)', 'Value': summary.totalSent },
            { 'Metric': 'Net Amount (KES)', 'Value': summary.netAmount },
            { 'Metric': 'Unique Contacts', 'Value': summary.uniqueContacts },
            { 'Metric': '', 'Value': '' },
            { 'Metric': '--- By Type ---', 'Value': '' },
            ...Object.entries(summary.byType).map(([type, count]) => ({
                'Metric': type,
                'Value': count,
            })),
        ];

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // --- Contacts Sheet ---
        const contacts = extractUniqueContacts(transactions);
        const contactsData = contacts.map((c, i) => ({
            '#': i + 1,
            'Name': c.name,
            'Phone': c.phone,
            'Total Amount (KES)': c.totalAmount,
            'Transaction Count': c.count,
        }));

        const wsContacts = XLSX.utils.json_to_sheet(contactsData);
        wsContacts['!cols'] = [
            { wch: 5 },
            { wch: 25 },
            { wch: 15 },
            { wch: 18 },
            { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, wsContacts, 'Contacts');

        // Generate binary
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

        // Save to file
        const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}.xlsx`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, wbout, 'base64');

        Logger.info('ExportExcel', `File saved to: ${filePath}`);

        return { success: true, filePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Logger.error('ExportExcel', 'Export failed', error);
        return { success: false, error: message };
    }
}

/**
 * Export and share via system share sheet.
 */
export async function exportAndShareMpesaExcel(
    transactions: ParsedMpesaTransaction[],
    options?: ExportOptions
): Promise<boolean> {
    const result = await exportMpesaTransactionsToExcel(transactions, options);

    if (!result.success || !result.filePath) {
        Logger.error('ExportExcel', `Export failed: ${result.error}`);
        return false;
    }

    try {
        await Share.open({
            url: `file://${result.filePath}`,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: result.filePath.split('/').pop() || 'MpesaTransactions.xlsx',
        });
        return true;
    } catch (error: any) {
        // User cancelled share - not an error
        if (error.message?.includes('User did not share')) {
            return true;
        }
        Logger.error('ExportExcel', 'Share failed', error);
        return false;
    }
}

/**
 * Export to CSV (simpler format, wider compatibility).
 */
export async function exportMpesaTransactionsToCSV(
    transactions: ParsedMpesaTransaction[],
    filename?: string
): Promise<ExportResult> {
    try {
        if (!transactions || transactions.length === 0) {
            return { success: false, error: 'No transactions to export' };
        }

        const csvFilename = filename || `MpesaTransactions_${formatDateForFilename(new Date())}`;

        // CSV header
        const header = 'Name,Phone,Amount (KES),Reference,Date,Type\n';

        // CSV rows
        const rows = transactions.map(tx => {
            const escapedName = escapeCsv(tx.name);
            return `${escapedName},${tx.phone || ''},${tx.amount},${tx.reference},${formatDate(tx.date)},${tx.type}`;
        }).join('\n');

        const csvContent = header + rows;

        // Save to file
        const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${csvFilename}.csv`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, csvContent, 'utf8');

        Logger.info('ExportCSV', `File saved to: ${filePath}`);

        return { success: true, filePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Logger.error('ExportCSV', 'Export failed', error);
        return { success: false, error: message };
    }
}

// ------------------------------------------------------
// Helper Functions
// ------------------------------------------------------

function formatDate(isoDate: string): string {
    try {
        const date = new Date(isoDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return isoDate;
    }
}

function formatDateForFilename(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}${month}${day}`;
}

function escapeCsv(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

interface Summary {
    totalCount: number;
    totalReceived: number;
    totalSent: number;
    netAmount: number;
    uniqueContacts: number;
    byType: Record<string, number>;
}

function calculateSummary(transactions: ParsedMpesaTransaction[]): Summary {
    const byType: Record<string, number> = {};
    const phones = new Set<string>();
    let totalReceived = 0;
    let totalSent = 0;

    for (const tx of transactions) {
        // Count by type
        byType[tx.type] = (byType[tx.type] || 0) + 1;

        // Track unique contacts
        if (tx.phone) phones.add(tx.phone);

        // Sum amounts
        if (tx.type === 'RECEIVED' || tx.type === 'DEPOSIT') {
            totalReceived += tx.amount;
        } else {
            totalSent += tx.amount;
        }
    }

    return {
        totalCount: transactions.length,
        totalReceived,
        totalSent,
        netAmount: totalReceived - totalSent,
        uniqueContacts: phones.size,
        byType,
    };
}

interface ContactSummary {
    name: string;
    phone: string;
    totalAmount: number;
    count: number;
}

function extractUniqueContacts(transactions: ParsedMpesaTransaction[]): ContactSummary[] {
    const contactMap = new Map<string, ContactSummary>();

    for (const tx of transactions) {
        if (!tx.phone) continue;

        const existing = contactMap.get(tx.phone);
        if (existing) {
            existing.totalAmount += tx.amount;
            existing.count++;
            // Keep the most recent name
            if (tx.name && tx.name !== 'Unknown') {
                existing.name = tx.name;
            }
        } else {
            contactMap.set(tx.phone, {
                name: tx.name,
                phone: tx.phone,
                totalAmount: tx.amount,
                count: 1,
            });
        }
    }

    return Array.from(contactMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount);
}
