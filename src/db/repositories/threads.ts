// --------------------------------------------------------------
// 📁 src/db/services/threads.ts
// Thread logic: grouping, metadata, preview lines, last message
// --------------------------------------------------------------

import {
    getMessagesByThread,
    getMessagesByThreadId,
    getMessagesByAddressComplete,
    getThreadSummaries,
    getUnreadByThread,
} from "@/db/repositories/messages";
import { MessageRow } from "@/db/database";
import { normalizeThreadId, isValidThreadId } from "@/db/utils/threadIdUtils";

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
 * 
 * @param threadId - Thread identifier (can be numeric ID, phone number, or string address)
 * @returns Complete thread information with all messages
 */
export async function getThreadDetails(threadId: string | number): Promise<MessageThread> {
    // Normalize the thread ID
    const normalizedId = normalizeThreadId(threadId);
    
    // Try to get messages by thread ID first
    let messages = await getMessagesByThreadId(normalizedId, 1000);
    
    // If no messages found by threadId, try by address (for phone number lookups)
    if (messages.length === 0 && isValidThreadId(threadId)) {
        messages = await getMessagesByAddressComplete(normalizedId, 1000);
    }

    if (messages.length === 0) {
        return {
            threadId: normalizedId,
            address: normalizedId,
            lastMessage: "",
            lastTimestamp: 0,
            unread: 0,
            messages: [],
        };
    }

    const newest = messages.sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
        threadId: normalizedId,
        address: newest.address,
        lastMessage: newest.body,
        lastTimestamp: newest.timestamp,
        unread: messages.filter((m) => !m.isRead).length,
        messages,
    };
}

/**
 * Get thread details by phone number (address).
 * This is a convenience function for phone number lookups.
 * 
 * @param address - Phone number or address string
 * @returns Complete thread information
 */
export async function getThreadByAddress(address: string): Promise<MessageThread> {
    return getThreadDetails(address);
}

/**
 * Get thread details by numeric thread ID.
 * This is a convenience function for numeric ID lookups.
 * 
 * @param threadId - Numeric thread ID
 * @returns Complete thread information
 */
export async function getThreadByNumericId(threadId: number): Promise<MessageThread> {
    return getThreadDetails(String(threadId));
}
