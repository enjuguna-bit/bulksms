import { runQuery } from '@/db/database/core';

export interface OptOutEntry {
    id: number;
    phoneNumber: string;
    reason: string;
    createdAt: number;
}

export async function addToBlacklist(phoneNumber: string, reason: string = 'manual'): Promise<void> {
    const now = Date.now();
    // Ensure unique by checking first or using INSERT OR IGNORE if schema supports it.
    // We'll use INSERT OR IGNORE for simplicity in SQLite if we added unique constraint, 
    // but for now let's just check existence to be safe or use simple insert.
    // Actually, easiest is "INSERT OR REPLACE" or check first. 
    // Let's use check first to avoid overwriting existing reason if we care, or just REPLAce.

    // Normalizing phone number is crucial. Assuming caller handles normalization or we do basic trim.
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    await runQuery(
        `INSERT OR REPLACE INTO opt_outs (phone_number, reason, created_at) VALUES (?, ?, ?)`,
        [cleanPhone, reason, now]
    );
}

export async function removeFromBlacklist(phoneNumber: string): Promise<void> {
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    await runQuery(`DELETE FROM opt_outs WHERE phone_number = ?`, [cleanPhone]);
}

export async function isBlacklisted(phoneNumber: string): Promise<boolean> {
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    const result = await runQuery(`SELECT id FROM opt_outs WHERE phone_number = ? LIMIT 1`, [cleanPhone]);
    return result.rows.length > 0;
}

export async function getBlacklist(limit = 100, offset = 0): Promise<OptOutEntry[]> {
    const results = await runQuery(
        `SELECT id, phone_number as phoneNumber, reason, created_at as createdAt FROM opt_outs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
    );
    return results as OptOutEntry[];
}
