// ------------------------------------------------------
// 💾 src/utils/mpesaToTransaction.ts
// Bridge: M-PESA SMS → SQLite Transaction Table
// Backend: react-native-sqlite-storage via ./sqlite wrapper
// ------------------------------------------------------

import { parseAndValidateMpesaSms } from "./mpesaParser";
import { openDatabase, SQLiteDatabase } from "../db/sqlite";

// ------------------------------------------------------
// 🧱 Database Setup
// ------------------------------------------------------

let dbInstance: SQLiteDatabase | null = null;
let dbPromise: Promise<SQLiteDatabase> | null = null;

async function getDB(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const _db = await openDatabase("transactions.db");

    // Ensure schema exists (multi-statement safe)
    if (_db.exec) {
      _db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ref TEXT UNIQUE,
          merchant TEXT,
          till TEXT,
          amount REAL,
          plan TEXT,
          dateISO TEXT,
          rawMessage TEXT
        );
      `);
    } else {
      await new Promise<void>(resolve => {
        _db.transaction(tx => {
          tx.executeSql(`
              CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ref TEXT UNIQUE,
                merchant TEXT,
                till TEXT,
                amount REAL,
                plan TEXT,
                dateISO TEXT,
                rawMessage TEXT
              );
            `);
        });
        resolve();
      });
    }
    dbInstance = _db;
    return _db;
  })();

  return dbPromise;
}

// ------------------------------------------------------
// 🔄 Converter: SMS → Transaction
// ------------------------------------------------------

/**
 * handleMpesaSmsSave()
 * Takes full raw SMS → Parses → Validates → Saves to SQLite
 * Uses INSERT OR IGNORE to avoid duplicates.
 */
export async function handleMpesaSmsSave(message: string) {
  const parsed = await parseAndValidateMpesaSms(message);

  if (!parsed) {
    console.warn("[mpesaToTransaction] invalid or duplicate message skipped");
    return null;
  }

  const { ref, merchant, till, amount, plan, dateISO } = parsed;

  const insertSQL = `
    INSERT OR IGNORE INTO transactions
    (ref, merchant, till, amount, plan, dateISO, rawMessage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const db = await getDB();
    // Sync mode available?
    if ((db as any).runSync) {
      (db as any).runSync(insertSQL, [
        ref,
        merchant,
        till,
        amount,
        plan,
        dateISO,
        message,
      ]);
    } else {
      // Fallback async mode
      db.transaction((tx) => {
        tx.executeSql(insertSQL, [
          ref,
          merchant,
          till,
          amount,
          plan,
          dateISO,
          message,
        ]);
      });
    }

    console.log("[mpesaToTransaction] saved:", ref);
    return parsed;
  } catch (err) {
    console.error("[mpesaToTransaction] DB error:", err);
    return null;
  }
}

// ------------------------------------------------------
// 📤 Query Helpers
// ------------------------------------------------------

/**
 * getAllTransactions()
 * Returns all transactions sorted by newest first.
 * Supports both sync and async DB modes.
 */
export async function getAllTransactions(): Promise<any[]> {
  const db = await getDB();
  // Prefer synchronous fetch if supported
  if ((db as any).getAllSync) {
    try {
      return (db as any).getAllSync(
        "SELECT * FROM transactions ORDER BY id DESC"
      );
    } catch (e) {
      console.warn("[mpesaToTransaction] getAllSync failed, fallback:", e);
    }
  }

  // Async fallback
  const results: any[] = [];
  try {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM transactions ORDER BY id DESC",
        [],
        (_: any, result: any) => {
          for (let i = 0; i < result.rows.length; i++) {
            results.push(result.rows.item(i));
          }
        }
      );
    });
  } catch (e) {
    console.warn("[mpesaToTransaction] fallback async query failed:", e);
  }

  return results;
}

/**
 * clearTransactions()
 * Deletes ALL rows, supports sync and async modes.
 */
export async function clearTransactions() {
  try {
    const db = await getDB();
    if ((db as any).runSync) {
      (db as any).runSync("DELETE FROM transactions");
    } else {
      db.transaction((tx) => {
        tx.executeSql("DELETE FROM transactions");
      });
    }
    console.log("[mpesaToTransaction] cleared");
  } catch (e) {
    console.warn("[mpesaToTransaction] clear failed:", e);
  }
}
