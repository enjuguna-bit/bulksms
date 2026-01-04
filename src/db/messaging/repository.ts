// -------------------------------------------------------------
// 📱 Messaging Repository - Conversations & Messages CRUD
// -------------------------------------------------------------

import { runQuery, executeTransaction } from '../database/core';
import { MESSAGING_SCHEMA } from './schema';
import {
  Conversation,
  Message,
  ConversationRow,
  MessageRow,
  ConversationFilter,
  SortOrder,
  rowToConversation,
  rowToMessage,
  generateThreadId,
  generateMessageId,
  generateAvatarColor,
  normalizePhoneNumber,
  getSnippet,
} from './types';

let schemaInitialized = false;

// -------------------------------------------------------------
// Schema Initialization
// -------------------------------------------------------------
export async function initMessagingSchema(): Promise<void> {
  if (schemaInitialized) return;

  try {
    await runQuery(MESSAGING_SCHEMA.conversations);
    await runQuery(MESSAGING_SCHEMA.conversationMessages);

    for (const index of MESSAGING_SCHEMA.indexes) {
      await runQuery(index);
    }

    schemaInitialized = true;
    console.log('[MessagingRepo] Schema initialized');
  } catch (error) {
    console.error('[MessagingRepo] Schema init failed:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// Conversation Repository
// -------------------------------------------------------------

export async function getConversations(
  filter: ConversationFilter = 'all',
  sortOrder: SortOrder = 'recent',
  searchQuery: string = '',
  limit: number = 50,        // ⚡ NEW: Pagination limit
  offset: number = 0         // ⚡ NEW: Pagination offset
): Promise<Conversation[]> {
  await initMessagingSchema();

  let whereClause = '';
  const params: any[] = [];

  // Filter conditions
  switch (filter) {
    case 'unread':
      whereClause = 'WHERE unread_count > 0 AND archived = 0';
      break;
    case 'archived':
      whereClause = 'WHERE archived = 1';
      break;
    default:
      whereClause = 'WHERE archived = 0';
  }

  // Search condition
  if (searchQuery.trim()) {
    whereClause += ' AND (recipient_name LIKE ? OR recipient_number LIKE ? OR snippet LIKE ?)';
    const searchPattern = `%${searchQuery}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Sort order
  let orderClause = '';
  switch (sortOrder) {
    case 'pinned_first':
      orderClause = 'ORDER BY pinned DESC, updated_at DESC';
      break;
    case 'unread_first':
      orderClause = 'ORDER BY unread_count DESC, updated_at DESC';
      break;
    case 'alphabetical':
      orderClause = 'ORDER BY recipient_name ASC';
      break;
    default:
      orderClause = 'ORDER BY updated_at DESC';
  }

  // ⚡ Add pagination
  const sql = `SELECT * FROM conversations ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await runQuery(sql, params);

  const rows = result.rows.raw() as ConversationRow[];
  return rows.map(rowToConversation);
}

/**
 * Get total count of conversations for pagination
 * ⚡ NEW: Used to calculate total pages for infinite scroll
 */
export async function getConversationsCount(
  filter: ConversationFilter = 'all',
  searchQuery: string = ''
): Promise<number> {
  await initMessagingSchema();

  let whereClause = '';
  const params: any[] = [];

  // Filter conditions
  switch (filter) {
    case 'unread':
      whereClause = 'WHERE unread_count > 0 AND archived = 0';
      break;
    case 'archived':
      whereClause = 'WHERE archived = 1';
      break;
    default:
      whereClause = 'WHERE archived = 0';
  }

  // Search condition
  if (searchQuery.trim()) {
    whereClause += ' AND (recipient_name LIKE ? OR recipient_number LIKE ? OR snippet LIKE ?)';
    const searchPattern = `%${searchQuery}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const result = await runQuery(
    `SELECT COUNT(*) as count FROM conversations ${whereClause}`,
    params
  );

  return result.rows.raw()[0]?.count || 0;
}

export async function getConversationById(id: number): Promise<Conversation | null> {
  await initMessagingSchema();

  const result = await runQuery(
    'SELECT * FROM conversations WHERE id = ?',
    [id]
  );

  const rows = result.rows.raw() as ConversationRow[];
  return rows.length > 0 ? rowToConversation(rows[0]) : null;
}

export async function getConversationByAddress(address: string): Promise<Conversation | null> {
  await initMessagingSchema();

  const normalized = normalizePhoneNumber(address);

  // Extract only digits from original address for LIKE matching
  const digitsOnly = address.replace(/[^\d]/g, '');

  // Only use LIKE matching if we have at least 9 digits (valid phone number suffix)
  // This prevents alphanumeric senders like "APRIL MON 9" from matching wrong threads
  if (digitsOnly.length >= 9) {
    const result = await runQuery(
      `SELECT * FROM conversations 
       WHERE recipient_number = ? OR recipient_number LIKE ?
       ORDER BY updated_at DESC LIMIT 1`,
      [normalized, `%${digitsOnly.slice(-9)}%`]
    );
    const rows = result.rows.raw() as ConversationRow[];
    if (rows.length > 0) return rowToConversation(rows[0]);
  }

  // For alphanumeric senders or short codes, use exact match only
  const result = await runQuery(
    `SELECT * FROM conversations 
     WHERE recipient_number = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [normalized]
  );

  const rows = result.rows.raw() as ConversationRow[];
  return rows.length > 0 ? rowToConversation(rows[0]) : null;
}

export async function getOrCreateConversation(
  address: string,
  contactName?: string
): Promise<Conversation> {
  await initMessagingSchema();

  // Try to find existing conversation
  const existing = await getConversationByAddress(address);
  if (existing) {
    // Update name if provided and different
    if (contactName && contactName !== existing.recipientName) {
      await updateConversation(existing.id, { recipientName: contactName });
      return { ...existing, recipientName: contactName };
    }
    return existing;
  }

  // Create new conversation
  const normalized = normalizePhoneNumber(address);
  const now = Date.now();
  const threadId = generateThreadId(address);
  const color = generateAvatarColor(address);
  const name = contactName || address;

  const result = await runQuery(
    `INSERT INTO conversations 
     (thread_id, recipient_name, recipient_number, last_message_timestamp, 
      snippet, unread_count, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [threadId, name, normalized, now, null, 0, color, now, now]
  );

  return {
    id: result.insertId,
    threadId,
    recipientName: name,
    recipientNumber: normalized,
    lastMessageTimestamp: now,
    snippet: null,
    unreadCount: 0,
    archived: false,
    pinned: false,
    muted: false,
    draftText: null,
    draftSavedAt: null,
    color,
    avatarUri: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateConversation(
  id: number,
  updates: Partial<Conversation>
): Promise<void> {
  await initMessagingSchema();

  const fieldMap: Record<string, string> = {
    recipientName: 'recipient_name',
    recipientNumber: 'recipient_number',
    lastMessageTimestamp: 'last_message_timestamp',
    snippet: 'snippet',
    unreadCount: 'unread_count',
    archived: 'archived',
    pinned: 'pinned',
    muted: 'muted',
    draftText: 'draft_text',
    draftSavedAt: 'draft_saved_at',
    color: 'color',
    avatarUri: 'avatar_uri',
  };

  const setClauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMap[key];
    if (dbField) {
      setClauses.push(`${dbField} = ?`);
      // Convert booleans to integers for SQLite
      params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    }
  }

  if (setClauses.length === 0) return;

  // Use provided updatedAt or default to now
  setClauses.push('updated_at = ?');
  params.push(updates.updatedAt || Date.now());

  params.push(id);

  await runQuery(
    `UPDATE conversations SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

export async function deleteConversation(id: number): Promise<void> {
  await initMessagingSchema();

  await executeTransaction([
    { sql: 'DELETE FROM conversation_messages WHERE conversation_id = ?', params: [id] },
    { sql: 'DELETE FROM conversations WHERE id = ?', params: [id] },
  ]);
}

export async function archiveConversation(id: number, archived: boolean = true): Promise<void> {
  await updateConversation(id, { archived });
}

export async function pinConversation(id: number, pinned: boolean = true): Promise<void> {
  await updateConversation(id, { pinned });
}

export async function muteConversation(id: number, muted: boolean = true): Promise<void> {
  await updateConversation(id, { muted });
}

export async function saveDraft(id: number, draftText: string | null): Promise<void> {
  await updateConversation(id, {
    draftText,
    draftSavedAt: draftText ? Date.now() : null,
  });
}

// -------------------------------------------------------------
// Message Repository
// -------------------------------------------------------------

export async function getMessages(
  conversationId: number,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  await initMessagingSchema();

  const result = await runQuery(
    `SELECT * FROM conversation_messages 
     WHERE conversation_id = ? 
     ORDER BY timestamp DESC 
     LIMIT ? OFFSET ?`,
    [conversationId, limit, offset]
  );

  const rows = result.rows.raw() as MessageRow[];
  return rows.map(rowToMessage);
}

export async function getMessageById(id: number): Promise<Message | null> {
  await initMessagingSchema();

  const result = await runQuery(
    'SELECT * FROM conversation_messages WHERE id = ?',
    [id]
  );

  const rows = result.rows.raw() as MessageRow[];
  return rows.length > 0 ? rowToMessage(rows[0]) : null;
}

const MAX_MESSAGE_LENGTH = 1600; // ⚡ Standard SMS limit (10 x 160 chars)

export async function insertMessage(
  conversationId: number,
  address: string,
  body: string | null,
  direction: 'incoming' | 'outgoing',
  status: string = 'pending',
  timestamp?: number,
  campaignId?: number,
  variantId?: string
): Promise<Message> {
  await initMessagingSchema();

  // ⚡ Validate and truncate message size
  let finalBody = body;
  let truncated = false;

  if (body && body.length > MAX_MESSAGE_LENGTH) {
    console.warn(`[MessagingRepo] Message exceeds ${MAX_MESSAGE_LENGTH} chars, truncating`);
    finalBody = body.substring(0, MAX_MESSAGE_LENGTH - 50) + '\n\n[Message truncated - exceeds limit]';
    truncated = true;
  }

  const now = timestamp || Date.now();
  const messageId = generateMessageId();

  const result = await runQuery(
    `INSERT INTO conversation_messages 
     (conversation_id, message_id, type, direction, address, body, 
      timestamp, date_sent, read, status, created_at, campaign_id, variant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conversationId,
      messageId,
      'sms',
      direction,
      address,
      finalBody,
      now,
      direction === 'outgoing' ? now : null,
      direction === 'outgoing' ? 1 : 0,
      truncated ? 'truncated' : status,
      now,
      campaignId || null,
      variantId || null
    ]
  );

  // Update conversation
  await updateConversation(conversationId, {
    lastMessageTimestamp: now,
    snippet: getSnippet(finalBody),
    unreadCount: direction === 'incoming' ?
      (await getUnreadCount(conversationId)) + 1 : undefined,
    updatedAt: now,
  });

  return {
    id: result.insertId,
    conversationId,
    messageId,
    type: 'sms',
    direction,
    address,
    body: finalBody,
    timestamp: now,
    dateSent: direction === 'outgoing' ? now : null,
    read: direction === 'outgoing',
    status: (truncated ? 'truncated' : status) as any,
    subscriptionId: -1,
    locked: false,
    deliveryReceiptCount: 0,
    readReceiptCount: 0,
    createdAt: now,
    campaignId,
    variantId,
  };
}

/**
 * Validate message body before sending
 * ⚡ NEW: Prevents oversized messages
 */
export function validateMessageBody(body: string): {
  valid: boolean;
  length: number;
  parts: number;
  error?: string;
} {
  const length = body.length;
  const singleSmsLimit = 160;
  const parts = Math.ceil(length / singleSmsLimit);

  if (length === 0) {
    return {
      valid: false,
      length: 0,
      parts: 0,
      error: 'Message cannot be empty',
    };
  }

  if (length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      length,
      parts,
      error: `Message too long (${length}/${MAX_MESSAGE_LENGTH} chars)`,
    };
  }

  return {
    valid: true,
    length,
    parts,
  };
}

export async function updateMessageStatus(
  id: number,
  status: string
): Promise<void> {
  await initMessagingSchema();

  await runQuery(
    'UPDATE conversation_messages SET status = ? WHERE id = ?',
    [status, id]
  );
}

export async function markMessageAsRead(id: number): Promise<void> {
  await initMessagingSchema();

  await runQuery(
    'UPDATE conversation_messages SET read = 1 WHERE id = ?',
    [id]
  );
}

export async function markConversationAsRead(conversationId: number): Promise<void> {
  await initMessagingSchema();

  await executeTransaction([
    {
      sql: 'UPDATE conversation_messages SET read = 1 WHERE conversation_id = ? AND read = 0',
      params: [conversationId]
    },
    {
      sql: 'UPDATE conversations SET unread_count = 0 WHERE id = ?',
      params: [conversationId]
    },
  ]);
}

export async function getUnreadCount(conversationId: number): Promise<number> {
  await initMessagingSchema();

  const result = await runQuery(
    'SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ? AND read = 0',
    [conversationId]
  );

  return result.rows.raw()[0]?.count || 0;
}

export async function getTotalUnreadCount(): Promise<number> {
  await initMessagingSchema();

  const result = await runQuery(
    'SELECT SUM(unread_count) as total FROM conversations WHERE archived = 0'
  );

  return result.rows.raw()[0]?.total || 0;
}

export async function deleteMessage(id: number): Promise<void> {
  await initMessagingSchema();

  await runQuery('DELETE FROM conversation_messages WHERE id = ?', [id]);
}

export async function deleteMessagesInConversation(conversationId: number): Promise<void> {
  await initMessagingSchema();

  await runQuery('DELETE FROM conversation_messages WHERE conversation_id = ?', [conversationId]);
}

// -------------------------------------------------------------
// Sync from Native SMS
// -------------------------------------------------------------

export async function syncMessageFromNative(
  address: string,
  body: string,
  direction: 'incoming' | 'outgoing',
  timestamp: number,
  contactName?: string
): Promise<{ conversation: Conversation; message: Message }> {
  await initMessagingSchema();

  const conversation = await getOrCreateConversation(address, contactName);

  // ⚡ Idempotency Check: Prevent duplicate inserts if listeners fire multiple times
  const existingResult = await runQuery(
    `SELECT * FROM conversation_messages 
     WHERE conversation_id = ? 
     AND timestamp = ? 
     AND direction = ? 
     AND body = ?
     LIMIT 1`,
    [conversation.id, timestamp, direction, body]
  );

  if (existingResult.rows.length > 0) {
    const existing = rowToMessage(existingResult.rows.item(0));
    console.log('[MessagingRepo] Skipping duplicate sync:', existing.id);
    return { conversation, message: existing };
  }

  const message = await insertMessage(
    conversation.id,
    address,
    body,
    direction,
    direction === 'incoming' ? 'received' : 'sent',
    timestamp
  );

  return { conversation, message };
}

// -------------------------------------------------------------
// Bulk Operations
// -------------------------------------------------------------

export async function archiveMultiple(ids: number[]): Promise<void> {
  await initMessagingSchema();

  const placeholders = ids.map(() => '?').join(',');
  await runQuery(
    `UPDATE conversations SET archived = 1, updated_at = ? WHERE id IN (${placeholders})`,
    [Date.now(), ...ids]
  );
}

export async function deleteMultiple(ids: number[]): Promise<void> {
  await initMessagingSchema();

  const placeholders = ids.map(() => '?').join(',');
  await executeTransaction([
    {
      sql: `DELETE FROM conversation_messages WHERE conversation_id IN (${placeholders})`,
      params: ids
    },
    {
      sql: `DELETE FROM conversations WHERE id IN (${placeholders})`,
      params: ids
    },
  ]);
}

export async function markMultipleAsRead(ids: number[]): Promise<void> {
  await initMessagingSchema();

  const placeholders = ids.map(() => '?').join(',');
  await executeTransaction([
    {
      sql: `UPDATE conversation_messages SET read = 1 WHERE conversation_id IN (${placeholders}) AND read = 0`,
      params: ids
    },
    {
      sql: `UPDATE conversations SET unread_count = 0 WHERE id IN (${placeholders})`,
      params: ids
    },
  ]);
}

// -------------------------------------------------------------
// Search
// -------------------------------------------------------------

export async function searchMessages(
  query: string,
  limit: number = 50
): Promise<{ conversation: Conversation; message: Message }[]> {
  await initMessagingSchema();

  const searchPattern = `%${query}%`;

  const result = await runQuery(
    `SELECT m.*, c.recipient_name, c.recipient_number, c.color
     FROM conversation_messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.body LIKE ?
     ORDER BY m.timestamp DESC
     LIMIT ?`,
    [searchPattern, limit]
  );

  const rows = result.rows.raw();
  return rows.map((row: any) => ({
    conversation: {
      id: row.conversation_id,
      threadId: '',
      recipientName: row.recipient_name,
      recipientNumber: row.recipient_number,
      lastMessageTimestamp: row.timestamp,
      snippet: row.body,
      unreadCount: 0,
      archived: false,
      pinned: false,
      muted: false,
      draftText: null,
      draftSavedAt: null,
      color: row.color,
      avatarUri: null,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    } as Conversation,
    message: rowToMessage(row),
  }));
}
