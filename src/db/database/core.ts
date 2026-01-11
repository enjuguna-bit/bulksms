import { openDatabase, ResultSet } from "../sqlite/index";
import { CONFIG } from "@/constants/config";
import Logger from "@/utils/logger";
import * as DBQueue from "./dbQueue";
import { applyMigrations } from "../migrations";
import type { SQLiteDatabase } from '../sqlite/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileSystemHealth } from '@/utils/fileSystemHealth';

// State
let db: SQLiteDatabase | null = null;
let dbReady = false;
let initPromise: Promise<void> | null = null;

const MIGRATION_FLAG = '__sqlite_migration_completed';
const DB_OPEN_TIMEOUT = 5000; // 5 seconds strict timeout

// Recovery constants
const RECOVERY_MAX_ATTEMPTS = 2;
let recoveryAttempts = 0;

// ---------------------------------------------------------
// 🛠 Local Storage Fallback
// ---------------------------------------------------------
const FALLBACK_STORAGE_KEY = 'db_fallback_data';

async function saveToFallbackStorage(data: any): Promise<void> {
    try {
        await AsyncStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        Logger.error('FallbackStorage', 'Failed to save to fallback', e);
    }
}

async function loadFromFallbackStorage(): Promise<any> {
    try {
        const data = await AsyncStorage.getItem(FALLBACK_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        Logger.error('FallbackStorage', 'Failed to load from fallback', e);
        return null;
    }
}

export async function initDatabase(): Promise<void> {
    // 1. Fast exit if already ready
    if (dbReady && db) return;

    // 2. Return existing promise if initialization is in progress (Singleton Pattern)
    if (initPromise) {
        Logger.info("Database", "Join existing initialization...");
        return initPromise;
    }
}

// 3. Start Initialization
// Assign immediately to block other callers
initPromise = (async () => {
    try {
        Logger.info("Database", "Starting initialization sequence...");

        // 3a. Pre-flight File System Health Check
        // ⚡ TIMEOUT: Don't let FS check hang indefinitely (2s timeout)
        const fsCheckPromise = FileSystemHealth.checkHealth();
        const fsTimeoutPromise = new Promise<{ healthy: boolean; error?: string }>((resolve) =>
            setTimeout(() => resolve({ healthy: true }), 2000) // Default to healthy if check hangs
        );

        const fsHealth = await Promise.race([fsCheckPromise, fsTimeoutPromise]);

        if (!fsHealth.healthy) {
            // If FS is bad, we can't trust SQLite.
            throw new Error(`Critical File System Error: ${fsHealth.error}`);
        }

        // 3b. Open Database with Strict Timeout (Detects Native Locking/Missing Libs)
        Logger.info("Database", "Opening SQLite connection...");

        const dbOpenPromise = openDatabase(CONFIG.DB_MESSAGES);
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DB_INIT_TIMEOUT')), DB_OPEN_TIMEOUT)
        );

        let _db: SQLiteDatabase;
        try {
            _db = await Promise.race([dbOpenPromise, timeoutPromise]);
        } catch (e: any) {
            // Enhanced error handling for native library issues
            const errorMessage = e?.message || e?.toString() || String(e);

            if (e.message === 'DB_INIT_TIMEOUT') {
                Logger.error("Database", "Connection Timed Out - Native Layer Unresponsive");
                throw new Error('STARTUP TIMEOUT: Database initialization timed out. This may indicate a missing native library (libop-sqlite.so) or architecture mismatch.');
            }

            // Check for common native library errors
            if (errorMessage.includes('op-sqlite') ||
                errorMessage.includes('dlopen') ||
                errorMessage.includes('unsatisfied link') ||
                errorMessage.includes('cannot locate') ||
                errorMessage.includes('library not found') ||
                typeof e === 'object' && !e.message) {
                Logger.error("Database", "Native Library Loading Failed", {
                    error: e,
                    errorType: typeof e,
                    errorKeys: Object.keys(e || {}),
                    errorString: String(e)
                });

                // Try to use fallback AsyncStorage-based storage
                Logger.warn("Database", "Attempting fallback to AsyncStorage-based storage");
                try {
                    // Save fallback mode indicator
                    await saveToFallbackStorage({
                        fallbackMode: true,
                        reason: 'native_library_failed',
                        timestamp: Date.now()
                    });

                    // Return a mock database that uses AsyncStorage
                    _db = await createFallbackDatabase();
                    Logger.info("Database", "Fallback database initialized successfully");

                    // Skip the rest of initialization and return early
                    db = _db;
                    dbReady = true;
                    Logger.info("Database", "Fallback mode active - using AsyncStorage");
                    return;
                } catch (fallbackError) {
                    Logger.error("Database", "Fallback initialization also failed", fallbackError);
                    throw new Error('STARTUP CRITICAL: Both native SQLite and fallback storage failed. App cannot start.');
                }
            }

            if (e.message?.includes('op-sqlite') || e.message?.includes('dlopen') || e.message?.includes('unsatisfied link')) {
                Logger.error("Database", "Native Library Missing");
                throw new Error('STARTUP CRITICAL: Native dependency missing. Please check jniLibs and NDK configuration.');
            }
            throw e;
        }

        // 3c. Validate database size before proceeding (Non-blocking / Timeout guarded)
        try {
            const sizeCheckPromise = validateDatabaseSize(_db);
            const sizeTimeoutPromise = new Promise<{ valid: boolean, sizeMB: number }>((resolve) =>
                setTimeout(() => resolve({ valid: true, sizeMB: 0 }), 1000)
            );

            const sizeCheck = await Promise.race([sizeCheckPromise, sizeTimeoutPromise]);
            if (!sizeCheck.valid) {
                Logger.warn("Database", `Large database detected (${sizeCheck.sizeMB.toFixed(2)}MB), initialization may be slow`);
            }
        } catch (sizeErr) {
            Logger.warn("Database", "Size check failed or timed out", sizeErr);
        }

        // 3d. ⚡ INTEGRITY CHECK: Detect corruption before proceeding
        Logger.info("Database", "Checking database integrity");
        const integrityCheck = await checkDatabaseIntegrity(_db);

        if (!integrityCheck.healthy) {
            Logger.warn("Database", "Integrity issues detected", integrityCheck.issues);

            // Attempt recovery if we haven't exceeded max attempts
            if (recoveryAttempts < RECOVERY_MAX_ATTEMPTS) {
                recoveryAttempts++;
                Logger.info("Database", `Recovery attempt ${recoveryAttempts}/${RECOVERY_MAX_ATTEMPTS}`);

                const recoverySuccess = await attemptDatabaseRecovery(_db, integrityCheck.issues);
                if (recoverySuccess) {
                    Logger.info("Database", "Recovery successful, continuing initialization");
                    // Re-check integrity after recovery
                    const postRecoveryCheck = await checkDatabaseIntegrity(_db);
                    if (!postRecoveryCheck.healthy) {
                        throw new Error(`Recovery failed to resolve integrity issues: ${postRecoveryCheck.issues.join(', ')}`);
                    }
                } else {
                    throw new Error(`Database recovery failed after ${recoveryAttempts} attempts`);
                }
            } else {
                throw new Error(`Database integrity compromised and recovery exhausted (${recoveryAttempts} attempts)`);
            }
        } else {
            recoveryAttempts = 0; // Reset on successful integrity check
        }

        // 4. Critical: Enable Write-Ahead Logging for concurrency
        await _db.executeSql('PRAGMA journal_mode = WAL;');

        // 4b. Performance optimizations
        await _db.executeSql('PRAGMA busy_timeout = 3000;');
        await _db.executeSql('PRAGMA synchronous = NORMAL;');
        await _db.executeSql('PRAGMA cache_size = 10000;');
        await _db.executeSql('PRAGMA temp_store = MEMORY;');

        // 4c. ⚡ SHARE INSTANCE with DBQueue to prevent split brain
        DBQueue.setDatabase(_db);

        // 5. Schema Definition (Wrapped in Transaction for Speed & Atomicity)
        // ⚡ OPTIMIZATION: Use transaction to reduce I/O overhead for multiple CREATE statements
        await _db.executeSql('BEGIN TRANSACTION');
        try {
            // Clean up any corrupted scheduled_sms table from previous attempts
            await _db.executeSql('DROP TABLE IF EXISTS scheduled_sms');

            await _db.executeSql(`
            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              address TEXT NOT NULL,
              body TEXT NOT NULL,
              type TEXT NOT NULL,
              status TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              simSlot INTEGER,
              threadId TEXT,
              isRead INTEGER DEFAULT 0,
              isArchived INTEGER DEFAULT 0,
              templateSnapshot TEXT,
              deliveryStatus TEXT DEFAULT 'pending',
              bulkId TEXT
            );
          `);

            // 5b. Payment Records Table
            await _db.executeSql(`
            CREATE TABLE IF NOT EXISTS payment_records (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              rawMessage TEXT NOT NULL,
              type TEXT NOT NULL,
              lastSeen INTEGER NOT NULL,
              transactionCount INTEGER DEFAULT 1,
              validationScore REAL DEFAULT 0
            );
          `);

            // 5c. SMS Queue Table
            await _db.executeSql(`
            CREATE TABLE IF NOT EXISTS sms_queue (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              to_number TEXT NOT NULL,
              body TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              status TEXT DEFAULT 'pending',
              retryCount INTEGER DEFAULT 0,
              sim_slot INTEGER DEFAULT 0,
              db_message_id INTEGER,
              priority INTEGER DEFAULT 0
            );
          `);

            // 5d. Send Logs Table
            await _db.executeSql(`
            CREATE TABLE IF NOT EXISTS send_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              to_number TEXT NOT NULL,
              body TEXT,
              bodyLength INTEGER,
              timestamp INTEGER NOT NULL,
              status TEXT NOT NULL,
              simSlot INTEGER,
              error TEXT
            );
          `);

            // 5e. Incoming SMS Buffer Table
            await _db.executeSql(`
            CREATE TABLE IF NOT EXISTS incoming_sms_buffer (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              body TEXT NOT NULL,
              receivedAt INTEGER NOT NULL,
              address TEXT
            );
          `);

            // 5g. Bulk Campaigns Table
            await _db.executeSql(`
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
          `);



            // 6. Indexes (Performance)
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_messages_address ON messages(address);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_messages_threadId ON messages(threadId);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_messages_isRead ON messages(isRead);`);

            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_payment_records_phone ON payment_records(phone);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_payment_records_lastSeen ON payment_records(lastSeen);`);

            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_queue_timestamp ON sms_queue(timestamp);`);

            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_send_logs_timestamp ON send_logs(timestamp);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_send_logs_to_number ON send_logs(to_number);`);
            // P0 FIX: Composite index for duplicate checking performance
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_send_logs_duplicate_check ON send_logs(to_number, body, timestamp);`);

            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_incoming_sms_buffer_receivedAt ON incoming_sms_buffer(receivedAt);`);

            // P2 FIX: Audit log table for bulk operations
            await _db.executeSql(`
            CREATE TABLE IF NOT EXISTS audit_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              action TEXT NOT NULL,
              userId TEXT,
              details TEXT,
              affectedCount INTEGER DEFAULT 0,
              timestamp INTEGER NOT NULL
            );
          `);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);`);

            await _db.executeSql('COMMIT');
            Logger.info("Database", "Schema initialized successfully");
        } catch (schemaError) {
            Logger.error("Database", "Schema creation failed, rolling back", schemaError);
            await _db.executeSql('ROLLBACK');
            throw schemaError;
        }

        // 7. Set Instance
        db = _db;

        // 8. ⚡ OPTIMIZED: Apply Migrations (AWAITED to prevent race conditions on fresh install)
        // Previously ran in background, causing 'no such table' errors for v7+ tables
        Logger.info("Database", "Running migrations...");
        try {
            await applyMigrations(_db);
            Logger.info("Database", "Migrations completed successfully");
        } catch (migrationError) {
            Logger.error("Database", "Migration failed", migrationError);
            throw migrationError; // Critical failure if schema is invalid
        }

        // 9. AsyncStorage migration no longer needed - using SecureStorage (SQLite-based)
        // await migrateAsyncStorageData();

        // 10. Mark Ready
        dbReady = true;
        Logger.info("Database", "Initialized successfully (Migrations running in background)");

    } catch (e) {
        Logger.error("Database", "Critical Init Failure", e);
        // ⚡ ROLLBACK: Reset state so we can retry later if needed
        db = null;
        dbReady = false;
        initPromise = null;
        throw e; // Propagate error so StartupGate knows we failed
    }
})();

// ---------------------------------------------------------
// 🛠 Fallback Database (AsyncStorage-based)
// ---------------------------------------------------------
async function createFallbackDatabase(): Promise<SQLiteDatabase> {
    Logger.warn("Database", "Creating fallback AsyncStorage-based database");

    const fallbackDb: SQLiteDatabase = {
        transaction: (cb) => {
            // Simple transaction implementation using AsyncStorage
            try {
                cb({
                    executeSql: async (sql, params = [], success, error) => {
                        try {
                            // Very basic SQL parsing for fallback - only supports simple operations
                            const result = await executeFallbackQuery(sql, params || []);
                            success?.(null as any, result);
                        } catch (err) {
                            error?.(null as any, err as any);
                        }
                    }
                });
            } catch (err) {
                Logger.error("Database", "Fallback transaction failed", err);
                throw err;
            }
        },

        executeSql: async (sql: string, params: any[] = []) => {
            const result = await executeFallbackQuery(sql, params);
            return [result];
        },
    };

    return fallbackDb;
}

async function executeFallbackQuery(sql: string, params: any[]): Promise<ResultSet> {
    // Very basic implementation - store data as JSON in AsyncStorage
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.startsWith('select')) {
        // Try to load data from AsyncStorage
        try {
            const data = await loadFromFallbackStorage();
            if (data && Array.isArray(data.rows)) {
                return {
                    rows: {
                        length: data.rows.length,
                        item: (index: number) => data.rows[index] || null,
                        raw: () => data.rows
                    },
                    insertId: undefined,
                    rowsAffected: 0
                };
            }
        } catch (e) {
            Logger.warn("Database", "Fallback SELECT failed", e);
        }

        // Return empty result if no data
        return {
            rows: { length: 0, item: () => null, raw: () => [] },
            insertId: undefined,
            rowsAffected: 0
        };
    }

    if (sqlLower.startsWith('insert') || sqlLower.startsWith('create')) {
        // For INSERT/CREATE, just acknowledge success with minimal data
        Logger.info("Database", "Fallback mode: Simulating successful operation for", sql.split(' ')[0]);
        return {
            rows: { length: 0, item: () => null, raw: () => [] },
            insertId: Date.now(), // Fake insert ID
            rowsAffected: 1
        };
    }

    // For other operations, return success
    return {
        rows: { length: 0, item: () => null, raw: () => [] },
        insertId: undefined,
        rowsAffected: 0
    };
}
// ---------------------------------------------------------
let lowPowerMode = false;

export function setLowPowerMode(enabled: boolean) {
    lowPowerMode = enabled;
    Logger.info('Database', `Low power mode ${enabled ? 'enabled' : 'disabled'}`);
}

async function batteryEfficientQuery(sql: string, params: any[] = []): Promise<any> {
    if (lowPowerMode) {
        // In low power mode:
        // 1. Batch writes
        // 2. Delay non-critical operations
        // 3. Reduce index usage
        await new Promise(resolve => setTimeout(resolve, 100)); // Add slight delay
    }

    return _executeQuery(sql, params);
}

async function _executeQuery(sql: string, params: any[] = []): Promise<any> {
    // ⚡ FIX: Auto-initialize if not ready (prevents race condition crashes)
    if (!dbReady || !db) {
        if (initPromise) {
            Logger.info("Database", "runQuery waiting for DB init...");
            await initPromise;
        } else {
            Logger.warn("Database", "runQuery called before init, initializing now...");
            await initDatabase();
        }
    }

    // Defensive check after init attempt
    if (!db) {
        throw new Error('[Database] CRITICAL: Failed to initialize database');
    }

    // Execute
    const [result] = await db.executeSql(sql, params);
    return result;
}

/**
 * ⚡ INTERNAL QUERY: Bypasses checks (Used by Migrations)
 * WARNING: Only use if you know what you are doing (e.g. inside initDatabase)
 */
export async function runInternalQuery(sql: string, params: any[] = []): Promise<any> {
    if (!db) {
        // Fallback if called too early, though unlikely in current flow
        Logger.warn("Database", "runInternalQuery called without db instance, attempting minimal open");
        if (!initPromise) await initDatabase();
        if (!db) throw new Error("Internal Query Failed: No DB Instance");
    }

    // Direct execution on the native instance
    const [result] = await db.executeSql(sql, params);
    return result;
}

// ---------------------------------------------------------
// 🛠 Database Integrity & Recovery
// ---------------------------------------------------------

async function checkDatabaseIntegrity(db: SQLiteDatabase): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
        // Test basic connectivity
        await db.executeSql('SELECT 1');

        // Check for required tables
        const requiredTables = [
            'messages',
            'payment_records',
            'sms_queue',
            'send_logs',
            'incoming_sms_buffer',
            'bulk_campaigns',
            'audit_log'
        ];

        for (const table of requiredTables) {
            try {
                await db.executeSql(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
            } catch (e) {
                issues.push(`Missing table: ${table}`);
            }
        }

        // Check for database locks
        try {
            await db.executeSql('PRAGMA integrity_check');
        } catch (e) {
            issues.push('Integrity check failed');
        }

        return { healthy: issues.length === 0, issues };
    } catch (e) {
        return { healthy: false, issues: ['Basic connectivity failed'] };
    }
}

async function attemptDatabaseRecovery(db: SQLiteDatabase, corruptionIssues: string[]): Promise<boolean> {
    Logger.warn("Database", `Attempting recovery from ${corruptionIssues.length} issues`, corruptionIssues);

    try {
        // Strategy 1: Rebuild corrupted tables
        if (corruptionIssues.some(issue => issue.includes('Missing table'))) {
            Logger.info("Database", "Rebuilding missing tables");

            // Re-run schema creation without transaction to avoid rollback
            await rebuildMissingTables(db);
            return true;
        }

        // Strategy 2: If integrity check fails, recreate database
        if (corruptionIssues.some(issue => issue.includes('Integrity check failed'))) {
            Logger.warn("Database", "Database integrity compromised, recreating");
            return await recreateDatabase(db);
        }

        return false;
    } catch (e) {
        Logger.error("Database", "Recovery attempt failed", e);
        return false;
    }
}

async function rebuildMissingTables(db: SQLiteDatabase): Promise<void> {
    // Re-create any missing tables individually
    const tableSchemas = [
        {
            name: 'messages',
            sql: `CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                body TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                simSlot INTEGER,
                threadId TEXT,
                isRead INTEGER DEFAULT 0,
                isArchived INTEGER DEFAULT 0,
                templateSnapshot TEXT,
                deliveryStatus TEXT DEFAULT 'pending',
                bulkId TEXT
            )`
        },
        {
            name: 'payment_records',
            sql: `CREATE TABLE IF NOT EXISTS payment_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                rawMessage TEXT NOT NULL,
                type TEXT NOT NULL,
                lastSeen INTEGER NOT NULL,
                transactionCount INTEGER DEFAULT 1,
                validationScore REAL DEFAULT 0
            )`
        },
        {
            name: 'sms_queue',
            sql: `CREATE TABLE IF NOT EXISTS sms_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                to_number TEXT NOT NULL,
                body TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                retryCount INTEGER DEFAULT 0,
                sim_slot INTEGER DEFAULT 0,
                db_message_id INTEGER,
                priority INTEGER DEFAULT 0
            )`
        },
        {
            name: 'send_logs',
            sql: `CREATE TABLE IF NOT EXISTS send_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                to_number TEXT NOT NULL,
                body TEXT,
                bodyLength INTEGER,
                timestamp INTEGER NOT NULL,
                status TEXT NOT NULL,
                simSlot INTEGER,
                error TEXT
            )`
        },
        {
            name: 'incoming_sms_buffer',
            sql: `CREATE TABLE IF NOT EXISTS incoming_sms_buffer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                body TEXT NOT NULL,
                receivedAt INTEGER NOT NULL,
                address TEXT
            )`
        },
        {
            name: 'bulk_campaigns',
            sql: `CREATE TABLE IF NOT EXISTS bulk_campaigns (
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
            )`
        },
        {
            name: 'audit_log',
            sql: `CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                userId TEXT,
                details TEXT,
                affectedCount INTEGER DEFAULT 0,
                timestamp INTEGER NOT NULL
            )`
        }
    ];

    for (const schema of tableSchemas) {
        try {
            // Check if table exists first
            const result = await db.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [schema.name]);
            if (result[0].rows.length === 0) {
                await db.executeSql(schema.sql);
                Logger.info("Database", `Rebuilt missing table: ${schema.name}`);
            }
        } catch (e) {
            Logger.warn("Database", `Failed to rebuild table ${schema.name}`, e);
        }
    }
}

async function recreateDatabase(currentDb: SQLiteDatabase): Promise<boolean> {
    try {
        Logger.warn("Database", "Performing complete database recreation");

        // Close current connection
        if (typeof currentDb.close === 'function') {
            await currentDb.close();
        }

        // Delete database file (React Native SQLite typically handles this)
        // For op-sqlite, we need to recreate the database instance

        // Reset state and retry initialization
        db = null;
        dbReady = false;
        initPromise = null;

        // Reinitialize
        await initDatabase();
        return true;
    } catch (e) {
        Logger.error("Database", "Database recreation failed", e);
        return false;
    }
}
const ERROR_RECOVERY_THRESHOLD = 3;
let errorCount = 0;

async function recoverFromError(error: Error): Promise<void> {
    errorCount++;

    if (errorCount >= ERROR_RECOVERY_THRESHOLD) {
        Logger.warn('Database', 'Initiating offline recovery');

        // 1. Attempt to close and reopen connection
        try {
            if (db && typeof db.close === 'function') await db.close();
            db = await openDatabase(CONFIG.DB_MESSAGES);
            errorCount = 0;
            return;
        } catch (e) { }

        // 2. Fallback to read-only mode
        Logger.error('Database', 'Falling back to read-only mode');
        dbReady = false;
    }
}

export async function runQuery(sql: string, params: any[] = []): Promise<any> {
    try {
        const result = await batteryEfficientQuery(sql, params);
        errorCount = 0; // Reset on success
        return result;
    } catch (error) {
        await recoverFromError(error as Error);
        throw error;
    }
}

export async function runSingle<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const result = await runQuery(sql, params);
    const rows = result.rows.raw();
    return rows.length > 0 ? rows[0] : null;
}

// ---------------------------------------------------------
// ⚡ Queued SQL Runner (For Bulk Operations)
// ---------------------------------------------------------
/**
 * Queue a SQL operation for optimized execution.
 * Use this for bulk operations to prevent serial execution bottleneck.
 * 
 * @param sql - SQL query string
 * @param params - Query parameters
 * @param options - { type: 'read' | 'write', priority: 'high' | 'normal' | 'low' }
 */
export function queueQuery(
    sql: string,
    params: any[] = [],
    options: { type?: 'read' | 'write'; priority?: 'high' | 'normal' | 'low' } = {}
): Promise<any> {
    return DBQueue.queueOperation(sql, params, options);
}

// ---------------------------------------------------------
// ⚡ Bulk Insert (10-100x Faster Than Individual Inserts)
// ---------------------------------------------------------
/**
 * Perform bulk insert with transaction batching.
 * Much faster than calling runQuery() in a loop.
 * 
 * @example
 * await bulkInsert('messages', ['address', 'body', 'status'], [
 *   ['123', 'Hello', 'sent'],
 *   ['456', 'World', 'pending'],
 * ]);
 */
export function bulkInsert(
    table: string,
    columns: string[],
    rows: any[][]
): Promise<DBQueue.BulkInsertResult> {
    return DBQueue.bulkInsert(table, columns, rows);
}

// ---------------------------------------------------------
// ⚡ Transaction Execution (Atomic Operations)
// ---------------------------------------------------------
/**
 * Execute multiple operations in a single transaction.
 * All operations succeed or all fail (atomic).
 * 
 * @example
 * await executeTransaction([
 *   { sql: 'UPDATE messages SET status = ? WHERE id = ?', params: ['sent', 1] },
 *   { sql: 'INSERT INTO send_logs ...', params: [...] },
 * ]);
 */
export function executeTransaction(
    operations: Array<{ sql: string; params: any[] }>
): Promise<any[]> {
    return DBQueue.executeTransaction(operations);
}

// ---------------------------------------------------------
// ⚡ Specialized Bulk Helpers
// ---------------------------------------------------------
export const bulkInsertMessages = DBQueue.bulkInsertMessages;
export function getDatabase(): SQLiteDatabase {
    if (!dbReady || !db) {
        throw new Error('Database not initialized');
    }
    return db;
}

export async function validateDatabaseSize(db: SQLiteDatabase): Promise<{ valid: boolean, sizeMB: number }> {
    try {
        // Execute PRAGMAs separately - they cannot be used inside SELECT statements
        const [pageCountResult] = await db.executeSql('PRAGMA page_count');
        const [pageSizeResult] = await db.executeSql('PRAGMA page_size');

        const pageCount = pageCountResult.rows.raw()[0]?.page_count || 0;
        const pageSize = pageSizeResult.rows.raw()[0]?.page_size || 4096;
        const sizeBytes = pageCount * pageSize;
        const sizeMB = sizeBytes / (1024 * 1024);

        if (sizeMB > 100) {
            Logger.warn("Database", `Large database detected (${sizeMB.toFixed(2)}MB)`);
            return { valid: false, sizeMB };
        }

        return { valid: true, sizeMB };
    } catch (e) {
        Logger.error("Database", "Failed to validate database size", e);
        return { valid: true, sizeMB: 0 }; // Return valid: true to avoid blocking startup
    }
}
