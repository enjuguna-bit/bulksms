// ===================================================================
// 📁 src/db/repositories/batchOperations.ts
// Batch operations for thread IDs
// ===================================================================

import { runQuery } from '../database/core';
import { normalizeThreadId } from '../utils/threadIdUtils';

/**
 * Mark multiple threads as read in a single batch operation.
 * More efficient than calling markThreadRead() multiple times.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Number of messages updated
 */
export async function markThreadsRead(threadIds: (string | number)[]): Promise<number> {
    if (!threadIds || threadIds.length === 0) {
        return 0;
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `UPDATE messages SET isRead = 1 WHERE threadId IN (${placeholders});`,
        normalizedIds
    );

    return result.rowsAffected ?? 0;
}

/**
 * Archive multiple threads in a single batch operation.
 * More efficient than calling archiveThread() multiple times.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Number of messages updated
 */
export async function archiveThreads(threadIds: (string | number)[]): Promise<number> {
    if (!threadIds || threadIds.length === 0) {
        return 0;
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `UPDATE messages SET isArchived = 1 WHERE threadId IN (${placeholders});`,
        normalizedIds
    );

    return result.rowsAffected ?? 0;
}

/**
 * Delete messages from multiple threads in a single batch operation.
 * WARNING: This permanently deletes messages. Use with caution.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Number of messages deleted
 */
export async function deleteThreads(threadIds: (string | number)[]): Promise<number> {
    if (!threadIds || threadIds.length === 0) {
        return 0;
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `DELETE FROM messages WHERE threadId IN (${placeholders});`,
        normalizedIds
    );

    return result.rowsAffected ?? 0;
}

/**
 * Unarchive multiple threads in a single batch operation.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Number of messages updated
 */
export async function unarchiveThreads(threadIds: (string | number)[]): Promise<number> {
    if (!threadIds || threadIds.length === 0) {
        return 0;
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `UPDATE messages SET isArchived = 0 WHERE threadId IN (${placeholders});`,
        normalizedIds
    );

    return result.rowsAffected ?? 0;
}

/**
 * Get unread message count for multiple threads.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Record mapping thread ID to unread count
 */
export async function getUnreadCountsForThreads(
    threadIds: (string | number)[]
): Promise<Record<string, number>> {
    if (!threadIds || threadIds.length === 0) {
        return {};
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `
        SELECT threadId, COUNT(*) as unread
        FROM messages
        WHERE threadId IN (${placeholders}) AND isRead = 0
        GROUP BY threadId;
        `,
        normalizedIds
    );

    const counts: Record<string, number> = {};
    result.rows.raw().forEach((row: any) => {
        if (row.threadId) {
            counts[row.threadId] = row.unread;
        }
    });

    return counts;
}

/**
 * Get total message count for multiple threads.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Record mapping thread ID to message count
 */
export async function getMessageCountsForThreads(
    threadIds: (string | number)[]
): Promise<Record<string, number>> {
    if (!threadIds || threadIds.length === 0) {
        return {};
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `
        SELECT threadId, COUNT(*) as messageCount
        FROM messages
        WHERE threadId IN (${placeholders})
        GROUP BY threadId;
        `,
        normalizedIds
    );

    const counts: Record<string, number> = {};
    result.rows.raw().forEach((row: any) => {
        if (row.threadId) {
            counts[row.threadId] = row.messageCount;
        }
    });

    return counts;
}

/**
 * Search for messages in multiple threads.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @param searchQuery - Text to search for
 * @returns Array of matching messages with their thread ID
 */
export async function searchInThreads(
    threadIds: (string | number)[],
    searchQuery: string
): Promise<Array<{ threadId: string; messageId: number; body: string; address: string }>> {
    if (!threadIds || threadIds.length === 0 || !searchQuery) {
        return [];
    }

    // Normalize all thread IDs
    const normalizedIds = threadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `
        SELECT threadId, id as messageId, body, address
        FROM messages
        WHERE threadId IN (${placeholders})
        AND body LIKE ?
        ORDER BY timestamp DESC;
        `,
        [...normalizedIds, `%${searchQuery}%`]
    );

    return result.rows.raw().map((row: any) => ({
        threadId: row.threadId,
        messageId: row.messageId,
        body: row.body,
        address: row.address,
    }));
}

/**
 * Merge messages from multiple threads into a single thread.
 * Useful for consolidating duplicate threads.
 * 
 * @param sourceThreadIds - Thread IDs to merge from
 * @param targetThreadId - Thread ID to merge into
 * @returns Number of messages moved
 */
export async function mergeThreads(
    sourceThreadIds: (string | number)[],
    targetThreadId: string | number
): Promise<number> {
    if (!sourceThreadIds || sourceThreadIds.length === 0) {
        return 0;
    }

    const normalizedTarget = normalizeThreadId(targetThreadId);
    const normalizedSources = sourceThreadIds.map(id => normalizeThreadId(id));

    // Create placeholders for SQL IN clause
    const placeholders = normalizedSources.map(() => '?').join(',');

    const result = await runQuery(
        `
        UPDATE messages
        SET threadId = ?
        WHERE threadId IN (${placeholders});
        `,
        [normalizedTarget, ...normalizedSources]
    );

    return result.rowsAffected ?? 0;
}

/**
 * Get all thread IDs that have messages.
 * Useful for listing all threads or validation.
 * 
 * @returns Array of all unique thread IDs in database
 */
export async function getAllThreadIds(): Promise<string[]> {
    const result = await runQuery(
        `SELECT DISTINCT threadId FROM messages WHERE threadId IS NOT NULL;`
    );

    return result.rows.raw().map((row: any) => row.threadId);
}

/**
 * Check if thread IDs exist in the database.
 * 
 * @param threadIds - Array of thread identifiers (string or number)
 * @returns Record mapping thread ID to existence boolean
 */
export async function checkThreadIdsExist(
    threadIds: (string | number)[]
): Promise<Record<string, boolean>> {
    if (!threadIds || threadIds.length === 0) {
        return {};
    }

    const normalizedIds = threadIds.map(id => normalizeThreadId(id));
    const placeholders = normalizedIds.map(() => '?').join(',');

    const result = await runQuery(
        `
        SELECT DISTINCT threadId
        FROM messages
        WHERE threadId IN (${placeholders});
        `,
        normalizedIds
    );

    const existingIds = new Set(result.rows.raw().map((row: any) => row.threadId));

    const existence: Record<string, boolean> = {};
    normalizedIds.forEach(id => {
        existence[id] = existingIds.has(id);
    });

    return existence;
}
