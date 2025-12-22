import { runQuery } from '../database/core';

export interface AuditLogEntry {
    id?: number;
    action: string;
    userId?: string;
    details?: string;
    affectedCount?: number;
    timestamp: number;
}

/**
 * Add an audit log entry for tracking bulk operations and security events.
 */
export async function addAuditLog(entry: AuditLogEntry): Promise<void> {
    const sql = `
    INSERT INTO audit_log (action, userId, details, affectedCount, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `;
    await runQuery(sql, [
        entry.action,
        entry.userId || null,
        entry.details || null,
        entry.affectedCount || 0,
        entry.timestamp
    ]);
}

/**
 * Get audit logs with pagination.
 */
export async function getAuditLogs(limit: number = 50, offset: number = 0): Promise<AuditLogEntry[]> {
    const result = await runQuery(
        'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
    );
    return result.rows.raw();
}

/**
 * Get audit logs by action type.
 */
export async function getAuditLogsByAction(action: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const result = await runQuery(
        'SELECT * FROM audit_log WHERE action = ? ORDER BY timestamp DESC LIMIT ?',
        [action, limit]
    );
    return result.rows.raw();
}

/**
 * Clear old audit logs.
 */
export async function pruneAuditLogs(maxAgeDays: number = 90): Promise<number> {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const result = await runQuery(
        'DELETE FROM audit_log WHERE timestamp < ?',
        [cutoff]
    );
    return result.rowsAffected || 0;
}
