import { openDatabase } from "../sqlite/index";
import { CONFIG } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "@/utils/logger";

// State
let db: any = null;
let dbReady = false;
let initPromise: Promise<void> | null = null;

const MIGRATION_FLAG = '__sqlite_migration_completed';

export async function initDatabase(): Promise<void> {
    // 1. Fast exit if already ready
    if (dbReady && db) return;

    // 2. Return existing promise if initialization is in progress (Singleton Pattern)
    // This prevents parallel calls from triggering multiple initializations
    if (initPromise) {
        Logger.info("Database", "Join existing initialization...");
        return initPromise;
    }

    // 3. Start Initialization
    // Assign immediately to block other callers
    initPromise = (async () => {
        try {
            Logger.info("Database", "Opening...");
            const _db = await openDatabase(CONFIG.DB_MESSAGES);

            // 4. Critical: Enable Write-Ahead Logging for concurrency
            await _db.executeSql('PRAGMA journal_mode = WAL;');

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
          isArchived INTEGER DEFAULT 0
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
          retryCount INTEGER DEFAULT 0
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
          receivedAt INTEGER NOT NULL
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

            await _db.executeSql(`CREATE INDEX IF NOT EXISTS idx_incoming_sms_buffer_receivedAt ON incoming_sms_buffer(receivedAt);`);

            // 7. Set Instance
            db = _db;

            // 8. Run Migrations (Safety net for existing users)
            await safeMigrations();

            // 9. Migrate AsyncStorage data (one-time, on first launch)
            await migrateAsyncStorageData();

            // 10. Mark Ready
            dbReady = true;
            Logger.info("Database", "Initialized successfully");

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
export async function runQuery(sql: string, params: any[] = []): Promise<any> {
    // ⚡ FIX: Auto-initialize if not ready (prevents race condition crashes)
    if (!dbReady || !db) {
        Logger.warn("Database", "runQuery called before init, initializing now...");
        await initDatabase();
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
// 🛠 Migration Safety
// ---------------------------------------------------------
async function safeMigrations() {
    // ⚡ FIX: Use db.executeSql directly. runQuery would trigger a deadlock by waiting for initPromise to resolve.
    const [res] = await db.executeSql(`PRAGMA table_info(messages);`);
    const cols = (res.rows.raw() as any[]).map((r: any) => r.name);

    // ⚡ FIX: Unrolled loop to prevent SQL injection warnings (Static Analysis hardening)

    if (!cols.includes("simSlot")) {
        Logger.info("Database", "Applying migration: simSlot");
        await db.executeSql(`ALTER TABLE messages ADD COLUMN simSlot INTEGER;`);
    }

    if (!cols.includes("threadId")) {
        Logger.info("Database", "Applying migration: threadId");
        await db.executeSql(`ALTER TABLE messages ADD COLUMN threadId TEXT;`);
    }

    if (!cols.includes("isRead")) {
        Logger.info("Database", "Applying migration: isRead");
        await db.executeSql(`ALTER TABLE messages ADD COLUMN isRead INTEGER DEFAULT 0;`);
    }

    if (!cols.includes("isArchived")) {
        Logger.info("Database", "Applying migration: isArchived");
        await db.executeSql(`ALTER TABLE messages ADD COLUMN isArchived INTEGER DEFAULT 0;`);
    }
}

// ---------------------------------------------------------
// 🔄 AsyncStorage → SQLite Migration
// ---------------------------------------------------------
async function migrateAsyncStorageData() {
    Logger.debug("Database", "Checking migration status...");

    try {
        const migrationFlag = await AsyncStorage.getItem(MIGRATION_FLAG);
        if (migrationFlag === 'true') {
            Logger.debug("Database", "Migration already completed, skipping");
            return;
        }

        Logger.info("Database", "Starting AsyncStorage → SQLite migration");

        let migratedCount = 0;

        // Migrate payment records
        try {
            const paymentData = await AsyncStorage.getItem('payment.capture.records');
            if (paymentData) {
                const records = JSON.parse(paymentData);
                if (Array.isArray(records)) {
                    for (const record of records) {
                        try {
                            await db.executeSql(`
                INSERT OR IGNORE INTO payment_records (phone, name, rawMessage, type, lastSeen, transactionCount)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [record.phone, record.name, record.rawMessage, record.type, record.lastSeen, record.transactionCount || 1]);
                            migratedCount++;
                        } catch (e) {
                            Logger.warn("Database", "Error migrating payment record", e);
                        }
                    }
                    Logger.debug("Database", `Migrated ${records.length} payment records`);
                }
            }
        } catch (e) {
            Logger.warn("Database", "Payment records migration error", e);
        }

        // Migrate SMS queue
        try {
            const queueData = await AsyncStorage.getItem('@pending_sms_queue_v1');
            if (queueData) {
                const queue = JSON.parse(queueData);
                if (Array.isArray(queue)) {
                    for (const msg of queue) {
                        try {
                            await db.executeSql(
                                'INSERT INTO sms_queue (to_number, body, timestamp) VALUES (?, ?, ?)',
                                [msg.to, msg.body, msg.timestamp]
                            );
                            migratedCount++;
                        } catch (e) {
                            Logger.warn("Database", "Error migrating queue message", e);
                        }
                    }
                    Logger.debug("Database", `Migrated ${queue.length} queued messages`);
                }
            }
        } catch (e) {
            Logger.warn("Database", "SMS queue migration error", e);
        }

        // Migrate send logs
        try {
            const logsData = await AsyncStorage.getItem('sms_logs_v1');
            if (logsData) {
                const logs = JSON.parse(logsData);
                if (Array.isArray(logs)) {
                    for (const log of logs) {
                        try {
                            const timestamp = log.timestamp || log.atMs || Date.now();
                            await db.executeSql(`
                INSERT INTO send_logs (to_number, body, bodyLength, timestamp, status, simSlot, error)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                                log.to || log.to_number || '',
                                log.body || null,
                                log.bodyLength || null,
                                timestamp,
                                log.status || 'unknown',
                                log.simSlot || null,
                                log.error || null
                            ]);
                            migratedCount++;
                        } catch (e) {
                            Logger.warn("Database", "Error migrating send log", e);
                        }
                    }
                    Logger.debug("Database", `Migrated ${logs.length} send logs`);
                }
            }
        } catch (e) {
            Logger.warn("Database", "Send logs migration error", e);
        }

        // Migrate incoming SMS buffer
        try {
            const incomingData = await AsyncStorage.getItem('sms.incoming.mpesa');
            if (incomingData) {
                const messages = JSON.parse(incomingData);
                if (Array.isArray(messages)) {
                    for (const msg of messages) {
                        try {
                            await db.executeSql(
                                'INSERT INTO incoming_sms_buffer (body, receivedAt) VALUES (?, ?)',
                                [msg.body, msg.receivedAt || Date.now()]
                            );
                            migratedCount++;
                        } catch (e) {
                            Logger.warn("Database", "Error migrating incoming SMS", e);
                        }
                    }
                    Logger.debug("Database", `Migrated ${messages.length} incoming SMS messages`);
                }
            }
        } catch (e) {
            Logger.warn("Database", "Incoming SMS migration error", e);
        }

        // Mark migration as complete
        await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
        Logger.info("Database", `Migration complete. Total items: ${migratedCount}`);

    } catch (e) {
        Logger.error("Database", "Critical migration error", e);
        // Don't throw - allow app to continue even if migration fails
    }
}
