export const CAMPAIGN_SCHEMA = {
    campaigns: `
    CREATE TABLE IF NOT EXISTS bulk_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'failed')),
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      delivered_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      scheduled_at INTEGER,
      variants_config TEXT 
    );
  `,
    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON bulk_campaigns(status);',
        'CREATE INDEX IF NOT EXISTS idx_campaigns_created ON bulk_campaigns(created_at DESC);'
    ]
};

// Note: variants_config will be a JSON string storing the A/B test setup
// e.g. { "A": "Message 1", "B": "Message 2" }
// or just null for single message campaigns
