// -------------------------------------------------------------
// 📱 Messaging Types - Conversations & Messages
// -------------------------------------------------------------

export type MessageType = 'sms' | 'mms';
export type MessageDirection = 'incoming' | 'outgoing';

export type MessageStatus =
  | 'pending'    // -1: Queued for sending
  | 'failed'     //  0: Send failed
  | 'sent'       //  1: Sent successfully
  | 'delivered'  //  2: Delivery confirmed
  | 'read'       //  3: Read receipt received
  | 'received';  // 100: Incoming message

export type ConversationFilter = 'all' | 'unread' | 'archived';
export type SortOrder = 'recent' | 'unread_first' | 'alphabetical' | 'pinned_first';

// -------------------------------------------------------------
// Conversation (Thread)
// -------------------------------------------------------------
export interface Conversation {
  id: number;
  threadId: string;           // Unique thread identifier
  recipientName: string;      // Contact name or phone number
  recipientNumber: string;    // Normalized phone number
  lastMessageTimestamp: number;
  snippet: string | null;     // Preview of last message
  unreadCount: number;
  archived: boolean;
  pinned: boolean;
  muted: boolean;
  draftText: string | null;
  draftSavedAt: number | null;
  color: number;              // Avatar background color
  avatarUri: string | null;
  createdAt: number;
  updatedAt: number;
}

// -------------------------------------------------------------
// Message
// -------------------------------------------------------------
export interface Message {
  id: number;
  conversationId: number;
  messageId: string | null;   // Unique message identifier
  type: MessageType;
  direction: MessageDirection;
  address: string;            // Phone number
  body: string | null;
  timestamp: number;
  dateSent: number | null;
  read: boolean;
  status: MessageStatus;
  subscriptionId: number;     // SIM slot
  locked: boolean;            // Starred/pinned
  deliveryReceiptCount: number;
  readReceiptCount: number;
  createdAt: number;
  campaignId?: number;        // Linked campaign ID
  variantId?: string;         // A/B testing variant ID
}

// -------------------------------------------------------------
// Database Row Types (for SQLite)
// -------------------------------------------------------------
export interface ConversationRow {
  id: number;
  thread_id: string;
  recipient_name: string;
  recipient_number: string;
  last_message_timestamp: number;
  snippet: string | null;
  unread_count: number;
  archived: number;           // SQLite boolean as 0/1
  pinned: number;
  muted: number;
  draft_text: string | null;
  draft_saved_at: number | null;
  color: number;
  avatar_uri: string | null;
  created_at: number;
  updated_at: number;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  message_id: string | null;
  type: string;               // 'sms' | 'mms'
  direction: string;          // 'incoming' | 'outgoing'
  address: string;
  body: string | null;
  timestamp: number;
  date_sent: number | null;
  read: number;               // SQLite boolean as 0/1
  status: string;
  subscription_id: number;
  locked: number;
  delivery_receipt_count: number;
  read_receipt_count: number;
  created_at: number;
  campaign_id?: number;
  variant_id?: string;
}

// -------------------------------------------------------------
// State Types
// -------------------------------------------------------------
export interface InboxState {
  conversations: Conversation[];
  isLoading: boolean;
  searchQuery: string;
  filter: ConversationFilter;
  sortOrder: SortOrder;
  selectedIds: Set<number>;
  isSelectionMode: boolean;
  error: string | null;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  draftText: string;
}

// -------------------------------------------------------------
// Mappers
// -------------------------------------------------------------
export function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    threadId: row.thread_id,
    recipientName: row.recipient_name,
    recipientNumber: row.recipient_number,
    lastMessageTimestamp: row.last_message_timestamp,
    snippet: row.snippet,
    unreadCount: row.unread_count,
    archived: row.archived === 1,
    pinned: row.pinned === 1,
    muted: row.muted === 1,
    draftText: row.draft_text,
    draftSavedAt: row.draft_saved_at,
    color: row.color,
    avatarUri: row.avatar_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    type: row.type as MessageType,
    direction: row.direction as MessageDirection,
    address: row.address,
    body: row.body,
    timestamp: row.timestamp,
    dateSent: row.date_sent,
    read: row.read === 1,
    status: row.status as MessageStatus,
    subscriptionId: row.subscription_id,
    locked: row.locked === 1,
    deliveryReceiptCount: row.delivery_receipt_count,
    readReceiptCount: row.read_receipt_count,
    createdAt: row.created_at,
    campaignId: row.campaign_id,
    variantId: row.variant_id,
  };
}

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------
export function getStatusValue(status: MessageStatus): number {
  const statusMap: Record<MessageStatus, number> = {
    pending: -1,
    failed: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    received: 100,
  };
  return statusMap[status];
}

export function statusFromValue(value: number): MessageStatus {
  const valueMap: Record<number, MessageStatus> = {
    [-1]: 'pending',
    0: 'failed',
    1: 'sent',
    2: 'delivered',
    3: 'read',
    100: 'received',
  };
  return valueMap[value] || 'pending';
}

export function generateThreadId(address: string): string {
  const normalized = normalizePhoneNumber(address);
  return `thread_${normalized}_${Date.now()}`;
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function normalizePhoneNumber(phone: string): string {
  const original = (phone || '').trim();
  if (!original) return '';

  // Remove all non-digit characters except leading +
  let normalized = original.replace(/[^\d+]/g, '');
  const digitChars = normalized.replace(/[^\d]/g, '');

  // If no numeric characters remain (short codes / alphanumeric senders),
  // fall back to the raw identifier to prevent grouping unrelated senders
  if (!digitChars.length) {
    return original.toUpperCase();
  }

  // Handle Kenyan numbers
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '+254' + normalized.substring(1);
  } else if (normalized.startsWith('254') && normalized.length === 12) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+') && normalized.length >= 9) {
    // Assume Kenyan if no country code
    if (normalized.length === 9) {
      normalized = '+254' + normalized;
    }
  }

  return normalized;
}

export function generateAvatarColor(address: string): number {
  const colors = [
    0xFF6B6B, // Red
    0x4ECDC4, // Teal
    0xFFD166, // Yellow
    0x06D6A0, // Green
    0x118AB2, // Blue
    0xEF476F, // Pink
    0x073B4C, // Dark Blue
    0x7209B7, // Purple
  ];

  const hash = address.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

export function formatTimestamp(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    // This week - show day name
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    // Older - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function getSnippet(body: string | null, hasMedia: boolean = false): string {
  if (body && body.trim()) {
    return body.length > 100 ? body.substring(0, 100) + '...' : body;
  }
  if (hasMedia) {
    return '📷 Media message';
  }
  return '';
}
