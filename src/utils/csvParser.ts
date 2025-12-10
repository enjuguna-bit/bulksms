// ------------------------------------------------------
// 📘 src/utils/csvParser.ts
// Lightweight CSV parser for mobile apps
// RFC 4180 compliant with smart column detection
// ------------------------------------------------------

import type { BulkSMSRecipient } from '@/types';

/** Normalize headers for fuzzy comparison. */
function normalizeHeader(header: string): string {
    return header.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
}

/** Clean cell values (remove invisible characters, trim). */
function cleanCellValue(value: unknown): string {
    if (value == null) return '';
    return value
        .toString()
        .replace(/[\u200B\u00A0]/g, '')
        .trim();
}

/** Parse amount such as "Ksh 1,200.00" → 1200. */
function parseAmount(value: unknown): number | null {
    const clean = cleanCellValue(value)
        .replace(/(Ksh|KES|ksh|kes)/gi, '')
        .replace(/,/g, '')
        .trim();
    const num = parseFloat(clean);
    return Number.isFinite(num) ? num : null;
}

/**
 * ✅ RFC 4180 compliant CSV parser
 * Handles quoted fields, escaped quotes, and newlines within quotes
 */
export function parseCSV(csvText: string): Record<string, string>[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    // Split by character to handle quotes properly
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentLine += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === '\n' && !inQuotes) {
            // End of line (not in quotes)
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
            currentLine = '';
        } else if (char === '\r') {
            // Skip carriage return
            continue;
        } else {
            currentLine += char;
        }
    }

    // Add last line if exists
    if (currentLine.trim()) {
        lines.push(currentLine);
    }

    if (lines.length === 0) return [];

    // Parse header row
    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
}

/**
 * Parse a single CSV line into fields
 */
function parseLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }

    // Add last field
    fields.push(currentField);

    return fields;
}

/**
 * ✅ Smart CSV parser with auto-detection
 * - Detects flexible headers for Name / Phone / Amount
 * - Cleans messy inputs and formats consistently
 */
export async function parseCsvSmart(
    csvText: string
): Promise<{ rows: BulkSMSRecipient[]; mapping: Record<string, string | null> }> {
    try {
        const data = parseCSV(csvText);

        if (!data.length) {
            return { rows: [], mapping: { name: null, phone: null, amount: null } };
        }

        // --- Define header aliases ---
        const ALIASES = {
            name: ['FullNames', 'Full Name', 'CustomerName', 'Name', 'Client'],
            phone: ['PhoneNumber', 'Phone', 'MobilePhone', 'Contact', 'Phone No'],
            amount: ['Arrears Amount', 'Amount', 'Balance', 'Loan', 'Cost', 'Arrears'],
        };

        const headers = Object.keys(data[0] || {});
        const normalizedHeaders = headers.map(normalizeHeader);

        const findMatch = (aliases: string[]): string | null => {
            for (const alias of aliases) {
                const normalizedAlias = normalizeHeader(alias);
                const idx = normalizedHeaders.indexOf(normalizedAlias);
                if (idx !== -1) return headers[idx];
            }
            return null;
        };

        const mapping = {
            name: findMatch(ALIASES.name),
            phone: findMatch(ALIASES.phone),
            amount: findMatch(ALIASES.amount),
        };

        const results: BulkSMSRecipient[] = [];

        for (const row of data) {
            const name = cleanCellValue(
                mapping.name ? row[mapping.name] : row['FullNames'] || row['Name']
            );

            const phoneRaw =
                mapping.phone ? row[mapping.phone] : row['PhoneNumber'] || row['Phone'];
            const phone = cleanCellValue(phoneRaw);

            const amount = mapping.amount
                ? parseAmount(row[mapping.amount])
                : parseAmount(row['Amount']);

            if (!phone) continue;
            results.push({ name, phone, amount });
        }

        return { rows: results, mapping };
    } catch (error) {
        console.error('❌ CSV parsing error:', error);
        return { rows: [], mapping: { name: null, phone: null, amount: null } };
    }
}

/**
 * ✅ Convert JSON array to CSV string (RFC 4180 compliant)
 */
export function toCsv(rows: Record<string, any>[]): string {
    if (!rows.length) return '';

    const keys = Object.keys(rows[0]);

    // Escape field if needed
    const escapeField = (value: any): string => {
        const str = value == null ? '' : String(value);
        // Quote if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const header = keys.map(escapeField).join(',');
    const body = rows
        .map(r => keys.map(k => escapeField(r[k])).join(','))
        .join('\n');

    return `${header}\n${body}`;
}

/**
 * ✅ Auto-suggest column mapping from headers
 */
export function autoSuggestMapping(headers: string[]) {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

    const nameCands = ['fullnames', 'fullname', 'name', 'customername', 'client'];
    const phoneCands = ['phonenumber', 'phone', 'mobile', 'msisdn', 'contact'];
    const amountCands = [
        'arrearsamount',
        'arrears',
        'loanbalance',
        'balance',
        'amount',
        'amountdue',
        'amountdisbursed',
        'totalamount',
        'cost',
    ];

    const name = headers.find(h => nameCands.includes(norm(h)));
    const phone = headers.find(h => phoneCands.includes(norm(h)));

    const amountCandidates = headers.filter(h =>
        amountCands.some(cand => norm(h).includes(cand))
    );

    let amount: string | null = null;
    if (amountCandidates.length === 1) {
        amount = amountCandidates[0];
    } else if (amountCandidates.length > 1) {
        const arrearsFirst = amountCandidates.find(
            h => norm(h).includes('arrears') || norm(h).includes('balance')
        );
        amount = arrearsFirst ?? null;
    }

    return { name, phone, amount, amountCandidates };
}

/**
 * ✅ Helper: summarize detected column mapping for user feedback.
 */
export function summarizeMapping(mapping: Record<string, string | null>): string {
    const fmt = (v: string | null) => (v ? `✅ ${v}` : '❌ Not Found');
    return `Detected Columns:
• Name → ${fmt(mapping.name)}
• Phone → ${fmt(mapping.phone)}
• Amount → ${fmt(mapping.amount)}`;
}
