import { runQuery } from '../database/core';
import { MessageRow, MsgStatus } from '../database/types';
export type { MessageRow };
import { normalizeThreadId, isValidThreadId, cleanThreadId } from '../utils/threadIdUtils';

const VALID_STATUSES: MsgStatus[] = ["pending", "sent", "delivered", "failed"];

// ---------------------------------------------------------
// ➕ Add Message
// ---------------------------------------------------------
export async function addMessage(
    address: string,
    body: string,
    type: string,
    status: MsgStatus,
    timestamp: number,
    threadId: string | null = null,
    simSlot: number | null = null,
    bulkId: string | null = null,
    deliveryStatus: string | null = null
): Promise<number> {
    const result = await runQuery(
        `
      INSERT INTO messages (address, body, type, status, timestamp, threadId, simSlot, bulkId, deliveryStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
        [address, body, type, status, timestamp, threadId ?? address, simSlot ?? null, bulkId, deliveryStatus]
    );

    return result.insertId ?? 0;
}

// ---------------------------------------------------------
// ✏️ Update Message Status
// ---------------------------------------------------------
export async function updateMessageStatus(id: number, status: MsgStatus): Promise<void> {
    if (!VALID_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
    await runQuery(`UPDATE messages SET status = ? WHERE id = ?;`, [status, id]);
}

// ---------------------------------------------------------
// 📥 Get All Messages (with Pagination)
// ---------------------------------------------------------
export async function getAllMessages(
    options: { limit?: number; offset?: number } = {}
): Promise<MessageRow[]> {
    const { limit = 100, offset = 0 } = options; // Reduced default from 500 to 100

    const result = await runQuery(
        `SELECT * FROM messages ORDER BY timestamp DESC LIMIT ? OFFSET ?;`,
        [limit, offset]
    );
    return result.rows.raw() as MessageRow[];
}

// ---------------------------------------------------------
// 📊 Get Total Message Count (for pagination)
// ---------------------------------------------------------
export async function getMessagesCount(): Promise<number> {
    const result = await runQuery('SELECT COUNT(*) as total FROM messages;');
    return result.rows.raw()[0].total ?? 0;
}

// ---------------------------------------------------------
// 📥 Get Messages by Address (with Pagination)
// ---------------------------------------------------------
export async function getMessagesByAddress(
    address: string,
    options: { limit?: number; offset?: number } = {}
): Promise<MessageRow[]> {
    const { limit = 100, offset = 0 } = options; // Reduced default from 500 to 100

    const result = await runQuery(
        `SELECT * FROM messages 
         WHERE address = ? 
         ORDER BY timestamp DESC 
         LIMIT ? OFFSET ?;`,
        [address, limit, offset]
    );

    return result.rows.raw() as MessageRow[];
}

// ---------------------------------------------------------
// 🧵 Get Messages by Thread
// ---------------------------------------------------------
export async function getMessagesByThread(
    threadId: string | number,
    limit = 500
): Promise<MessageRow[]> {
    // Normalize thread ID to handle both numeric and string formats
    const normalizedId = normalizeThreadId(threadId);

    const result = await runQuery(
        `
      SELECT * FROM messages
      WHERE threadId = ?
      ORDER BY timestamp DESC
      LIMIT ${limit};
    `,
        [normalizedId]
    );

    return result.rows.raw() as MessageRow[];
}

// ---------------------------------------------------------
// 🔔 Unread Count
// ---------------------------------------------------------
export async function getUnreadCount(): Promise<number> {
    const res = await runQuery(
        `SELECT COUNT(*) as unread FROM messages WHERE isRead = 0;`
    );
    return res.rows.raw()[0].unread ?? 0;
}

// ---------------------------------------------------------
// 🔔 Unread Count by Thread
// ---------------------------------------------------------
export async function getUnreadByThread(): Promise<Record<string, number>> {
    const res = await runQuery(`
    SELECT threadId, COUNT(*) as unread
    FROM messages
    WHERE isRead = 0
    GROUP BY threadId;
  `);

    const out: Record<string, number> = {};
    res.rows.raw().forEach((row: any) => {
        if (row.threadId) {
            out[row.threadId] = row.unread;
        }
    });

    return out;
}

// ---------------------------------------------------------
// 📘 Mark Thread as Read
// ---------------------------------------------------------
export async function markThreadRead(threadId: string | number): Promise<void> {
    // Normalize thread ID to handle both numeric and string formats
    const normalizedId = normalizeThreadId(threadId);
    await runQuery(`UPDATE messages SET isRead = 1 WHERE threadId = ?;`, [normalizedId]);
}

// ---------------------------------------------------------
// 📦 Archive Thread
// ---------------------------------------------------------
export async function archiveThread(threadId: string | number): Promise<void> {
    // Normalize thread ID to handle both numeric and string formats
    const normalizedId = normalizeThreadId(threadId);
    await runQuery(`UPDATE messages SET isArchived = 1 WHERE threadId = ?;`, [normalizedId]);
}

// ---------------------------------------------------------
// 🧹 Clear All Messages
// ---------------------------------------------------------
export async function clearMessages(): Promise<void> {
    await runQuery(`DELETE FROM messages;`);
}
// ---------------------------------------------------------
// 🧵 Get Thread Summaries (Optimized)
// ---------------------------------------------------------
export async function getThreadSummaries(limit = 20, offset = 0): Promise<MessageRow[]> {
    // ⚡ OPTIMIZED: Fetch only the latest message per thread directly from DB.
    // We utilize SQLite's MAX() behavior with GROUP BY to pick the latest row.
    // Note: We also join with a subquery for unread counts if needed, but for now 
    // let's stick to the message content and get unread counts separately or via DB view.
    // For simplicity and speed:
    const result = await runQuery(`
        SELECT * FROM messages 
        WHERE id IN (
            SELECT MAX(id) 
            FROM messages 
            GROUP BY threadId
        )
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?;
    `, [limit, offset]);

    return result.rows.raw() as MessageRow[];
}

// ---------------------------------------------------------
// 🧵 Get Messages by Thread (String ID - Alias)
// ---------------------------------------------------------
/**
 * Retrieve all messages for a given thread using a phone number (string identifier).
 * This is an explicit alias for getMessagesByThread that emphasizes string IDs.
 * 
 * @param threadId - Phone number or string identifier
 * @param limit - Maximum messages to retrieve
 * @returns Array of messages in the thread
 */
export async function getMessagesByThreadId(
    threadId: string | number,
    limit = 500
): Promise<MessageRow[]> {
    return getMessagesByThread(threadId, limit);
}

// ---------------------------------------------------------
// 🧵 Get Messages by Address (Direct phone number lookup)
// ---------------------------------------------------------
/**
 * Retrieve all messages for a given phone number address.
 * This looks up messages both by address field AND threadId for completeness.
 * 
 * @param address - Phone number or address string
 * @param limit - Maximum messages to retrieve (default 500)
 * @returns Array of messages from/to this address
 */
export async function getMessagesByAddressComplete(
    address: string,
    limit = 500
): Promise<MessageRow[]> {
    // Query messages where either address OR threadId matches the phone number
    const result = await runQuery(
        `
      SELECT * FROM messages
      WHERE address = ? OR threadId = ?
      ORDER BY timestamp DESC
      LIMIT ${limit};
    `,
        [address, address]
    );

    return result.rows.raw() as MessageRow[];
}
