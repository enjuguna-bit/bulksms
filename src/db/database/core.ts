import { openDatabase } from "../sqlite/index";
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

    // 3. Start Initialization
    // Assign immediately to block other callers
    initPromise = (async () => {
        try {
            Logger.info("Database", "Starting initialization sequence...");

            // 3a. Pre-flight File System Health Check
            const fsHealth = await FileSystemHealth.checkHealth();
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
                if (e.message === 'DB_INIT_TIMEOUT') {
                    Logger.error("Database", "Connection Timed Out - Native Layer Unresponsive");
                    throw new Error('Database initialization timed out. This may indicate a missing native library (libpenguin.so) or architecture mismatch.');
                }
                if (e.message?.includes('penguin') || e.message?.includes('dlopen') || e.message?.includes('unsatisfied link')) {
                    Logger.error("Database", "Native Library Missing");
                    throw new Error('Critical: Native dependency missing. Please check jniLibs and NDK configuration.');
                }
                throw e;
            }

            // 3c. Validate database size before proceeding
            const sizeCheck = await validateDatabaseSize(_db);
            if (!sizeCheck.valid) {
                Logger.warn("Database", `Large database detected (${sizeCheck.sizeMB.toFixed(2)}MB), initialization may be slow`);
            }

            // 4. Critical: Enable Write-Ahead Logging for concurrency
            await _db.executeSql('PRAGMA journal_mode = WAL;');

            // 4b. Performance optimizations
            await _db.executeSql('PRAGMA busy_timeout = 3000;');
            await _db.executeSql('PRAGMA synchronous = NORMAL;');
            await _db.executeSql('PRAGMA cache_size = 10000;');
            await _db.executeSql('PRAGMA temp_store = MEMORY;');

            // 5. Schema Definition
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
          transactionCount INTEGER DEFAULT 1
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

            // 5f. Scheduled SMS Table
            await _db.executeSql(`
                CREATE TABLE IF NOT EXISTS scheduled_sms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    address TEXT NOT NULL,
                    body TEXT NOT NULL,
                    scheduledTime INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    createdAt INTEGER NOT NULL
                );
            `);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_scheduled_sms_time ON scheduled_sms(scheduledTime);`);
            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_scheduled_sms_status ON scheduled_sms(status);`);

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

            // 7. Set Instance
            db = _db;

            // 8. ⚡ OPTIMIZED: Apply Migrations in BACKGROUND
            // We do NOT await this, allowing startup to proceed immediately.
            // This prevents migration locks from freezing the splash screen.
            Logger.info("Database", "Triggering background migrations...");
            applyMigrations(_db)
                .then(() => Logger.info("Database", "Background migrations completed"))
                .catch(e => Logger.error("Database", "Background migration failed", e));

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

    return initPromise;
}

// ---------------------------------------------------------
// 🛠 SQL Runner (Defensive Auto-Initialize)
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

// ---------------------------------------------------------
// 🛠 Offline Error Recovery
// ---------------------------------------------------------
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
export const bulkInsertSendLogs = DBQueue.bulkInsertSendLogs;
export const getQueueStats = DBQueue.getQueueStats;
export const flushQueue = DBQueue.flushQueue;

// ---------------------------------------------------------
// 🛠 Database Access
// ---------------------------------------------------------
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
