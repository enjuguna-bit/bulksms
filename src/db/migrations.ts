// -------------------------------------------------------------
// 📦 Database Migration System
// -------------------------------------------------------------
// Provides version tracking and safe schema upgrades

import { runQuery, executeTransaction, runInternalQuery } from './database/core';

export interface Migration {
    version: number;
    name: string;
    up?: string[];   // SQL statements to apply migration
    run?: (db: any) => Promise<void>; // Custom logic for complex migrations
    down?: string[]; // SQL statements to rollback (optional)
}

const MIGRATIONS: Migration[] = [
    {
        version: 1,
        name: 'Core local schema',
        up: [
            `CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                body TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS local_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation TEXT NOT NULL,
                data TEXT NOT NULL,
                attempts INTEGER DEFAULT 0
            )`
        ]
    },
    {
        version: 2,
        name: 'Local search optimization',
        up: [
            'CREATE INDEX IF NOT EXISTS idx_messages_search ON messages(body)',
            'CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)'
        ]
    },
    {
        version: 3,
        name: 'Add priority column to sms_queue',
        run: async (db) => {
            try {
                // Try to select the column first (cheap check)
                await runInternalQuery('SELECT priority FROM sms_queue LIMIT 1');
                console.log('Migration v3: Column "priority" already exists. Skipping.');
            } catch (e) {
                // Only runs if column is missing
                console.log('Migration v3: Adding "priority" column...');
                await runInternalQuery('ALTER TABLE sms_queue ADD COLUMN priority INTEGER DEFAULT 0;');
            }
        }
    },
    {
        version: 4,
        name: 'Bulk SMS Campaigns & Tracking',
        up: [
            // Create Campaigns Table
            `CREATE TABLE IF NOT EXISTS bulk_campaigns (
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
            )`,
            'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON bulk_campaigns(status)',
            'CREATE INDEX IF NOT EXISTS idx_campaigns_created ON bulk_campaigns(created_at DESC)',

            // Add campaign tracking to messages - DEPRECATED/MOVED
            // 'ALTER TABLE conversation_messages ADD COLUMN variant_id TEXT',
            // 'CREATE INDEX IF NOT EXISTS idx_msg_campaign ON conversation_messages(campaign_id)'
        ],
        run: async (db) => {
            // Safe migration for existing tables only
            try {
                // Check if table exists first
                const result = await db.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name='conversation_messages'");
                if (result[0].rows.length > 0) {
                    await db.executeSql('ALTER TABLE conversation_messages ADD COLUMN campaign_id TEXT');
                    await db.executeSql('ALTER TABLE conversation_messages ADD COLUMN variant_id TEXT');
                    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_msg_campaign ON conversation_messages(campaign_id)');
                }
            } catch (e) {
                console.warn('[Migration v4] safely skipped conversation_messages update:', e);
            }
        }
    },
    {
        version: 5,
        name: 'Compliance & Opt-Outs',
        up: [
            `CREATE TABLE IF NOT EXISTS opt_outs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL UNIQUE,
                reason TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )`,
            'CREATE INDEX IF NOT EXISTS idx_opt_outs_phone ON opt_outs(phone_number)'
        ]
    },
    {
        version: 6,
        name: 'Inbox Scanner Transactions',
        up: [
            `CREATE TABLE IF NOT EXISTS parsed_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER,
                provider TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                party_name TEXT,
                party_phone TEXT,
                timestamp INTEGER NOT NULL,
                raw_body TEXT,
                created_at INTEGER NOT NULL
            )`,
            'CREATE INDEX IF NOT EXISTS idx_parsed_tx_timestamp ON parsed_transactions(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_parsed_tx_provider ON parsed_transactions(provider)'
        ]
    },
    {
        version: 7,
        name: 'Scheduled SMS Table',
        up: [
            'DROP TABLE IF EXISTS scheduled_sms',
            `CREATE TABLE IF NOT EXISTS scheduled_sms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                body TEXT NOT NULL,
                scheduledTime INTEGER NOT NULL,
                createdAt INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'cancelled'))
            )`,
            'CREATE INDEX IF NOT EXISTS idx_scheduled_sms_time ON scheduled_sms(scheduledTime)',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_sms_status ON scheduled_sms(status)'
        ]
    }
];

/**
 * Get current database schema version
 */
export async function getCurrentVersion(): Promise<number> {
    try {
        // Create version table if doesn't exist
        await runInternalQuery(`
      CREATE TABLE IF NOT EXISTS database_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);

        const result = await runInternalQuery(
            'SELECT MAX(version) as version FROM database_version'
        );

        return result.rows.raw()[0]?.version || 0;
    } catch (error) {
        console.error('[Migrations] Error getting version:', error);
        return 0;
    }
}

/**
 * Apply all pending migrations
 * Safe to call multiple times - only applies new migrations
 */
export async function applyMigrations(db?: any): Promise<void> {
    const currentVersion = await getCurrentVersion();
    const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
        console.log('[Migrations] Database is up to date (v' + currentVersion + ')');
        return;
    }

    console.log(`[Migrations] Applying ${pendingMigrations.length} migrations from v${currentVersion}...`);

    // Group migrations into sequential batches where later migrations depend on earlier ones
    const migrationBatches = [
        [pendingMigrations[0]], // v1 must run first
        pendingMigrations.slice(1) // v2-v4 can run in parallel
    ];

    for (const batch of migrationBatches) {
        await Promise.all(batch.map(async (migration) => {
            console.log(`[Migrations] Applying v${migration.version}: ${migration.name}`);

            try {
                const startTime = Date.now();
                const migrationPromise = (async () => {
                    if (migration.run) {
                        await migration.run(db);
                    } else if (migration.up) {
                        const statements = migration.up.map(sql => ({ sql, params: [] }));
                        await executeTransaction(statements);
                    }
                    await runInternalQuery(
                        'INSERT INTO database_version (version, name, applied_at) VALUES (?, ?, ?)',
                        [migration.version, migration.name, Date.now()]
                    );
                })();

                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Migration v${migration.version} timed out after 60 seconds`));
                    }, 60000);
                });

                await Promise.race([migrationPromise, timeoutPromise]);
                const duration = Date.now() - startTime;
                console.log(`[Migrations] ✅ Applied v${migration.version} (${duration}ms)`);
            } catch (error) {
                console.error(`[Migrations] ❌ Failed v${migration.version}:`, error);
                if (migration.version === 2) {
                    console.warn('[Migrations] Skipping FTS migration due to error');
                    try {
                        await runInternalQuery(
                            'INSERT INTO database_version (version, name, applied_at) VALUES (?, ?, ?)',
                            [migration.version, migration.name + ' (skipped)', Date.now()]
                        );
                    } catch (recordError) {
                        console.error('[Migrations] Failed to record skipped migration:', recordError);
                    }
                    return;
                }
                let errorMsg = String(error);
                if (typeof error === 'object' && error !== null) {
                    try {
                        // specialized handling for potential [object Object]
                        errorMsg = JSON.stringify(error, Object.getOwnPropertyNames(error));
                    } catch (e) {
                        errorMsg = String(error);
                    }
                }
                throw new Error(`Migration v${migration.version} failed: ${errorMsg}`);
            }
        }));
    }

    console.log('[Migrations] All migrations applied successfully');
}

/**
 * Get migration history
 */
export async function getMigrationHistory(): Promise<{ version: number; name: string; appliedAt: number }[]> {
    try {
        await runQuery(`
      CREATE TABLE IF NOT EXISTS database_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);

        const result = await runQuery(
            'SELECT version, name, applied_at FROM database_version ORDER BY version ASC'
        );

        return result.rows.raw();
    } catch (error) {
        console.error('[Migrations] Error getting history:', error);
        return [];
    }
}

/**
 * Rollback last migration (use with caution)
 */
export async function rollbackLastMigration(): Promise<void> {
    const currentVersion = await getCurrentVersion();

    if (currentVersion === 0) {
        console.log('[Migrations] No migrations to rollback');
        return;
    }

    const migration = MIGRATIONS.find(m => m.version === currentVersion);

    if (!migration) {
        throw new Error(`Migration v${currentVersion} not found`);
    }

    if (!migration.down || migration.down.length === 0) {
        throw new Error(`Migration v${currentVersion} has no rollback defined`);
    }

    console.log(`[Migrations] Rolling back v${currentVersion}: ${migration.name}`);

    try {
        // Apply rollback statements
        const statements = migration.down.map(sql => ({ sql, params: [] }));
        await executeTransaction(statements);

        // Remove from version table
        await runQuery(
            'DELETE FROM database_version WHERE version = ?',
            [currentVersion]
        );

        console.log(`[Migrations] ✅ Rolled back v${currentVersion}`);
    } catch (error) {
        console.error(`[Migrations] ❌ Rollback failed:`, error);
        throw error;
    }
}

/**
 * Check if database needs migrations
 */
export async function needsMigrations(): Promise<boolean> {
    const currentVersion = await getCurrentVersion();
    const latestVersion = Math.max(...MIGRATIONS.map(m => m.version));
    return currentVersion < latestVersion;
}
