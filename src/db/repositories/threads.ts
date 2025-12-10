// --------------------------------------------------------------
// 📁 src/db/services/threads.ts
// Thread logic: grouping, metadata, preview lines, last message
// --------------------------------------------------------------

import {
    getMessagesByThread,
    getThreadSummaries,
    getUnreadByThread,
} from "@/db/repositories/messages";
import { MessageRow } from "@/db/database";

/**
 * Build a thread summary object.
 */
export interface MessageThread {
    threadId: string;
    address: string;
    lastMessage: string;
    lastTimestamp: number;
    unread: number;
    messages: MessageRow[];
}

/**
 * Group messages into threads and return metadata list.
 */
export async function getThreadsList(limit = 50, offset = 0): Promise<MessageThread[]> {
    // ⚡ OPTIMIZED: Use SQL-level grouping instead of in-memory.
    const summaries = await getThreadSummaries(limit, offset);
    const unreadCounts = await getUnreadByThread();

    return summaries.map(last => ({
        threadId: last.threadId ?? last.address,
        address: last.address,
        lastMessage: last.body,
        lastTimestamp: last.timestamp,
        unread: unreadCounts[last.threadId ?? last.address] || 0,
        messages: [last], // Just the last message for preview
    }));
}

/**
 * Get complete thread details.
 */
export async function getThreadDetails(threadId: string): Promise<MessageThread> {
    const messages = await getMessagesByThread(threadId, 1000);

    if (messages.length === 0) {
        return {
            threadId,
            address: threadId,
            lastMessage: "",
            lastTimestamp: 0,
            unread: 0,
            messages: [],
        };
    }

    const newest = messages.sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
        threadId,
        address: newest.address,
        lastMessage: newest.body,
        lastTimestamp: newest.timestamp,
        unread: messages.filter((m) => !m.isRead).length,
        messages,
    };
}
