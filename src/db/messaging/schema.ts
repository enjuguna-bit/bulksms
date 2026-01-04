// -------------------------------------------------------------
// 📱 Messaging Database Schema
// -------------------------------------------------------------

export const MESSAGING_SCHEMA = {
  conversations: `
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT UNIQUE NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_number TEXT NOT NULL,
      last_message_timestamp INTEGER NOT NULL,
      snippet TEXT,
      unread_count INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      muted INTEGER DEFAULT 0,
      draft_text TEXT,
      draft_saved_at INTEGER,
      color INTEGER DEFAULT 0,
      avatar_uri TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  conversationMessages: `
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      message_id TEXT,
      type TEXT NOT NULL DEFAULT 'sms',
      direction TEXT NOT NULL,
      address TEXT NOT NULL,
      body TEXT,
      timestamp INTEGER NOT NULL,
      date_sent INTEGER,
      read INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      subscription_id INTEGER DEFAULT -1,
      locked INTEGER DEFAULT 0,
      delivery_receipt_count INTEGER DEFAULT 0,
      read_receipt_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_conv_thread_id ON conversations(thread_id);',
    'CREATE INDEX IF NOT EXISTS idx_conv_updated_at ON conversations(updated_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_conv_recipient_number ON conversations(recipient_number);',
    'CREATE INDEX IF NOT EXISTS idx_conv_pinned_unread ON conversations(pinned DESC, unread_count DESC, updated_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_msg_conversation ON conversation_messages(conversation_id);',
    'CREATE INDEX IF NOT EXISTS idx_msg_timestamp ON conversation_messages(timestamp DESC);',
    'CREATE INDEX IF NOT EXISTS idx_msg_address ON conversation_messages(address);',
    'CREATE INDEX IF NOT EXISTS idx_msg_status ON conversation_messages(status);',
    'CREATE INDEX IF NOT EXISTS idx_msg_read ON conversation_messages(read);',
  ],
};

export const INIT_MESSAGING_SQL = `
  ${MESSAGING_SCHEMA.conversations}
  ${MESSAGING_SCHEMA.conversationMessages}
  ${MESSAGING_SCHEMA.indexes.join('\n')}
`;
