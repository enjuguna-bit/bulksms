// ------------------------------------------------------
// 💬 src/utils/parseMpesaEnhanced.ts
// Enhanced M-PESA Parser for Kenyan Market
// Extracts: name, phone, amount, reference, date, type
// Supports all Safaricom M-PESA message formats
// ------------------------------------------------------

import { normalizePhone } from "./dataParsers";

// ------------------------------------------------------
// Types
// ------------------------------------------------------

export type MpesaTransactionType =
    | 'RECEIVED'      // Money received from someone
    | 'SENT'          // Money sent to someone
    | 'PAYBILL'       // PayBill payment
    | 'BUYGOODS'      // Buy Goods / Till payment
    | 'DEPOSIT'       // Cash deposit at agent
    | 'WITHDRAW'      // Cash withdrawal from agent
    | 'AIRTIME'       // Airtime purchase
    | 'FULIZA'        // Fuliza loan
    | 'UNKNOWN';

export interface ParsedMpesaTransaction {
    /** Customer/sender/recipient name */
    name: string;
    /** Normalized phone number (+254XXXXXXXXX) */
    phone: string;
    /** Transaction amount in KES */
    amount: number;
    /** M-PESA transaction reference code (e.g., THQ5ZPB2TN) */
    reference: string;
    /** ISO date string */
    date: string;
    /** Transaction type */
    type: MpesaTransactionType;
    /** Remaining balance after transaction (if available) */
    balance?: number;
    /** PayBill business number (if applicable) */
    paybill?: string;
    /** Till/Buy Goods number (if applicable) */
    till?: string;
    /** Account number for PayBill (if applicable) */
    account?: string;
    /** Original SMS message */
    rawMessage: string;
}

// ------------------------------------------------------
// M-PESA Message Detection
// ------------------------------------------------------

/**
 * Check if a message is an M-PESA transaction message
 */
export function isMpesaMessage(message: string): boolean {
    if (!message || typeof message !== 'string') return false;

    const upper = message.toUpperCase();

    // Must have transaction code pattern at start
    const hasTransactionCode = /^[A-Z0-9]{8,12}\s/i.test(message.trim());

    // Must have M-PESA indicators
    const hasMpesaKeywords =
        upper.includes('CONFIRMED') ||
        upper.includes('M-PESA') ||
        upper.includes('MPESA') ||
        upper.includes('KSH') ||
        upper.includes('RECEIVED') ||
        upper.includes('SENT TO') ||
        upper.includes('PAID TO') ||
        upper.includes('WITHDRAW') ||
        upper.includes('DEPOSIT');

    return hasTransactionCode && hasMpesaKeywords;
}

// ------------------------------------------------------
// Main Parser
// ------------------------------------------------------

/**
 * Parse an M-PESA SMS message and extract structured data.
 * Handles all Kenyan Safaricom M-PESA formats.
 * 
 * @param message - Raw SMS message body
 * @returns Parsed transaction or null if not recognized
 */
export function parseMpesaMessage(message: string): ParsedMpesaTransaction | null {
    try {
        if (!message || typeof message !== 'string') return null;

        // Normalize whitespace
        const text = message.replace(/\s+/g, ' ').trim();

        // Extract transaction reference (8-12 alphanumeric at start)
        const refMatch = text.match(/^([A-Z0-9]{8,12})\s/i);
        const reference = refMatch ? refMatch[1].toUpperCase() : '';

        if (!reference) return null; // Not a valid M-PESA message

        // Extract amount (handles "Ksh1,500.00" or "Ksh 1,500.00" or "Ksh1500")
        const amountMatch = text.match(/Ksh\s?([0-9,]+(?:\.\d{1,2})?)/i);
        const amount = amountMatch
            ? parseFloat(amountMatch[1].replace(/,/g, ''))
            : 0;

        // Extract balance (if present)
        const balanceMatch = text.match(/balance.*?Ksh\s?([0-9,]+(?:\.\d{1,2})?)/i);
        const balance = balanceMatch
            ? parseFloat(balanceMatch[1].replace(/,/g, ''))
            : undefined;

        // Extract date
        const date = extractDate(text);

        // Determine transaction type and extract relevant details
        const { type, name, phone, paybill, till, account } = extractTransactionDetails(text);

        return {
            name,
            phone,
            amount,
            reference,
            date,
            type,
            balance,
            paybill,
            till,
            account,
            rawMessage: message,
        };
    } catch (error) {
        console.error('[parseMpesaMessage] Error:', error);
        return null;
    }
}

// ------------------------------------------------------
// Transaction Type Detection
// ------------------------------------------------------

interface TransactionDetails {
    type: MpesaTransactionType;
    name: string;
    phone: string;
    paybill?: string;
    till?: string;
    account?: string;
}

function extractTransactionDetails(text: string): TransactionDetails {
    const upper = text.toUpperCase();

    // 1. RECEIVED - "Ksh1,500.00 received from JOHN DOE 0712345678"
    if (upper.includes('RECEIVED FROM')) {
        const match = text.match(/received from\s+([A-Za-z\s]+)\s+(\d{9,12})/i);
        if (match) {
            return {
                type: 'RECEIVED',
                name: cleanName(match[1]),
                phone: normalizePhone(match[2]),
            };
        }
        // Alternative: "received from JOHN DOE"
        const altMatch = text.match(/received from\s+([A-Za-z\s]+?)(?:\s+on|\s+New)/i);
        if (altMatch) {
            return {
                type: 'RECEIVED',
                name: cleanName(altMatch[1]),
                phone: '',
            };
        }
    }

    // 2. SENT - "Ksh500.00 sent to JANE DOE 0798765432"
    if (upper.includes('SENT TO') && !upper.includes('FOR ACCOUNT')) {
        const match = text.match(/sent to\s+([A-Za-z\s]+)\s+(\d{9,12})/i);
        if (match) {
            return {
                type: 'SENT',
                name: cleanName(match[1]),
                phone: normalizePhone(match[2]),
            };
        }
    }

    // 3. PAYBILL - "Ksh2,000.00 paid to KENYA POWER. for account 12345"
    if (upper.includes('PAYBILL') || (upper.includes('PAID TO') && upper.includes('FOR ACCOUNT'))) {
        const merchantMatch = text.match(/paid to\s+([A-Za-z0-9\s]+?)(?:\s*\.|,|\s+for)/i);
        const paybillMatch = text.match(/(?:PayBill|business)\s*(?:number)?\s*:?\s*(\d{4,8})/i);
        const accountMatch = text.match(/(?:for\s+)?account\s+([A-Za-z0-9]+)/i);

        return {
            type: 'PAYBILL',
            name: merchantMatch ? cleanName(merchantMatch[1]) : 'PayBill Payment',
            phone: '',
            paybill: paybillMatch ? paybillMatch[1] : undefined,
            account: accountMatch ? accountMatch[1] : undefined,
        };
    }

    // 4. BUY GOODS / TILL - "Ksh1,000.00 paid to SAFARICOM SHOP. Till Number 123456"
    if (upper.includes('TILL') || upper.includes('BUY GOODS')) {
        const merchantMatch = text.match(/paid to\s+([A-Za-z0-9\s]+?)(?:\s*\.|,|\s+Till)/i);
        const tillMatch = text.match(/(?:Till|Merchant)\s*(?:Number|No\.?)?\s*:?\s*(\d{4,8})/i);

        return {
            type: 'BUYGOODS',
            name: merchantMatch ? cleanName(merchantMatch[1]) : 'Till Payment',
            phone: '',
            till: tillMatch ? tillMatch[1] : undefined,
        };
    }

    // 5. DEPOSIT - "Ksh5,000.00 deposited"
    if (upper.includes('DEPOSIT') || upper.includes('DEPOSITED')) {
        // Try to extract agent info
        const agentMatch = text.match(/(?:at|from)\s+([A-Za-z0-9\s]+?)(?:\s+New|\s+on|\.)/i);
        return {
            type: 'DEPOSIT',
            name: agentMatch ? cleanName(agentMatch[1]) : 'M-PESA Agent',
            phone: '',
        };
    }

    // 6. WITHDRAW - "Ksh2,000.00 withdrawn"
    if (upper.includes('WITHDRAW') || upper.includes('WITHDRAWN')) {
        const agentMatch = text.match(/(?:from|at)\s+([A-Za-z0-9\s]+?)(?:\s+New|\s+on|\.)/i);
        return {
            type: 'WITHDRAW',
            name: agentMatch ? cleanName(agentMatch[1]) : 'M-PESA Agent',
            phone: '',
        };
    }

    // 7. AIRTIME - "You bought Ksh100.00 of airtime"
    if (upper.includes('AIRTIME') || upper.includes('YOU BOUGHT')) {
        return {
            type: 'AIRTIME',
            name: 'Safaricom Airtime',
            phone: '',
        };
    }

    // 8. FULIZA - "Fuliza M-PESA amount"
    if (upper.includes('FULIZA')) {
        return {
            type: 'FULIZA',
            name: 'Fuliza Loan',
            phone: '',
        };
    }

    // Fallback - try generic extraction
    const genericName = extractGenericName(text);
    const genericPhone = extractGenericPhone(text);

    return {
        type: 'UNKNOWN',
        name: genericName,
        phone: genericPhone,
    };
}

// ------------------------------------------------------
// Helper Functions
// ------------------------------------------------------

function extractDate(text: string): string {
    // Try format: "on 22/12/24 at 10:30 AM" or "on 22/12/2024"
    const dateMatch = text.match(/on\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

    if (dateMatch) {
        const parts = dateMatch[1].split(/[\/\-]/);
        const [d, m, yRaw] = parts;
        const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;

        try {
            const dateObj = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T09:00:00Z`);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString();
            }
        } catch (e) {
            // Fall through to default
        }
    }

    return new Date().toISOString();
}

function cleanName(name: string): string {
    if (!name) return 'Unknown';

    return name
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')  // Remove special characters
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim() || 'Unknown';
}

function extractGenericName(text: string): string {
    // Try various patterns
    const patterns = [
        /(?:from|to)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+\d/i,
        /(?:from|to)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return cleanName(match[1]);
        }
    }

    return 'Unknown';
}

function extractGenericPhone(text: string): string {
    // Look for phone number patterns (Kenyan format)
    const phonePatterns = [
        /\b(07\d{8})\b/,           // 07XXXXXXXX
        /\b(7\d{8})\b/,            // 7XXXXXXXX
        /\b(254\d{9})\b/,          // 254XXXXXXXXX
        /\b(\+254\d{9})\b/,        // +254XXXXXXXXX
        /\b(\d{10,12})\b/,         // Generic long number
    ];

    for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match) {
            return normalizePhone(match[1]);
        }
    }

    return '';
}

// ------------------------------------------------------
// Batch Parser
// ------------------------------------------------------

/**
 * Parse multiple M-PESA messages and return valid transactions.
 * Automatically filters out non-M-PESA messages and duplicates.
 * 
 * @param messages - Array of raw SMS messages
 * @returns Array of parsed transactions (deduplicated by reference)
 */
export function parseMpesaMessages(messages: string[]): ParsedMpesaTransaction[] {
    const seen = new Set<string>();
    const results: ParsedMpesaTransaction[] = [];

    for (const msg of messages) {
        if (!isMpesaMessage(msg)) continue;

        const parsed = parseMpesaMessage(msg);
        if (!parsed || !parsed.reference) continue;

        // Deduplicate by reference
        if (seen.has(parsed.reference)) continue;
        seen.add(parsed.reference);

        results.push(parsed);
    }

    return results;
}

// ------------------------------------------------------
// Summary/Statistics
// ------------------------------------------------------

export interface MpesaSummary {
    totalTransactions: number;
    totalReceived: number;
    totalSent: number;
    totalAmount: number;
    uniqueContacts: number;
    byType: Record<MpesaTransactionType, number>;
}

/**
 * Generate summary statistics from parsed transactions
 */
export function getMpesaSummary(transactions: ParsedMpesaTransaction[]): MpesaSummary {
    const byType: Record<MpesaTransactionType, number> = {
        RECEIVED: 0,
        SENT: 0,
        PAYBILL: 0,
        BUYGOODS: 0,
        DEPOSIT: 0,
        WITHDRAW: 0,
        AIRTIME: 0,
        FULIZA: 0,
        UNKNOWN: 0,
    };

    const contacts = new Set<string>();
    let totalReceived = 0;
    let totalSent = 0;

    for (const tx of transactions) {
        byType[tx.type]++;

        if (tx.phone) {
            contacts.add(tx.phone);
        }

        if (tx.type === 'RECEIVED' || tx.type === 'DEPOSIT') {
            totalReceived += tx.amount;
        } else {
            totalSent += tx.amount;
        }
    }

    return {
        totalTransactions: transactions.length,
        totalReceived,
        totalSent,
        totalAmount: totalReceived + totalSent,
        uniqueContacts: contacts.size,
        byType,
    };
}
