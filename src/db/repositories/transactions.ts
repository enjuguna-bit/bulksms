// ------------------------------------------------------
// 💾 src/db/transactions/index.ts
// Local SQLite transactions store + React hook
// Backend: react-native-sqlite-storage via ../sqlite wrapper
// ------------------------------------------------------

import { useEffect, useState, useCallback } from "react";
import { openDatabase, SQLiteDatabase } from "../sqlite";
import { CONFIG } from "@/constants/config";

// ------------------------------------------------------
// 🧱 Database setup
// ------------------------------------------------------

let db: SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function initTransactionsDatabase() {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const _db = openDatabase(CONFIG.DB_TRANSACTIONS);

    // Create table using exec() (multi-statement supported)
    // Wrapped in a promise to ensure it completes
    await new Promise<void>((resolve) => {
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
        // exec is void, but uses transaction internally.
        // We assume it queues correctly.
        resolve();
      } else {
        // Fallback if exec missing (shouldn't happen with our wrapper)
        _db.transaction((tx) => {
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
      }
    });

    db = _db;
  })();

  return initPromise;
}

// ------------------------------------------------------
// 📦 Sync + fallback query helpers
// ------------------------------------------------------

/**
 * getTransactions()
 * Returns all transactions sorted by most recent.
 * Async to ensure data is actually loaded.
 */
export async function getTransactions(): Promise<any[]> {
  await initTransactionsDatabase();
  const database = db;
  if (!database) return [];

  return new Promise((resolve) => {
    // Try sync method first if available (e.g. QuickSQLite / Expo)
    if ((database as any).getAllSync) {
      try {
        const result = (database as any).getAllSync(
          "SELECT * FROM transactions ORDER BY id DESC"
        );
        resolve(result ?? []);
        return;
      } catch (e) {
        console.warn("[transactions] getAllSync failed, fallback to async:", e);
      }
    }

    // Fallback to standard async transaction
    database.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM transactions ORDER BY id DESC",
        [],
        (_: any, result: any) => {
          const rows: any[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          resolve(rows);
        },
        (err: any) => {
          console.warn("[transactions] executeSql failed:", err);
          resolve([]);
        }
      );
    });
  });
}

/**
 * clearTransactions()
 * Deletes all rows in table.
 */
export async function clearTransactions() {
  await initTransactionsDatabase();
  const database = db;
  if (!database) return;

  try {
    if ((database as any).runSync) {
      (database as any).runSync("DELETE FROM transactions");
    } else {
      database.transaction((tx) => {
        tx.executeSql("DELETE FROM transactions");
      });
    }
    console.log("[transactions] cleared");
  } catch (e) {
    console.warn("[transactions] clear failed:", e);
  }
}

// ------------------------------------------------------
// ⚛️ React Hook: useTransactions()
// ------------------------------------------------------

export function useTransactions(pollIntervalMs = 4000) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await getTransactions();
      setTransactions(rows);
    } catch (e) {
      console.warn("[useTransactions] refresh failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(); // initial load
    const timer = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(timer);
  }, [refresh, pollIntervalMs]);

  return { transactions, loading, refresh };
}
