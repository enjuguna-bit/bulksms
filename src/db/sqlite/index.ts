// ------------------------------------------------------------
// 📁 src/db/sqlite/index.ts
// JSI-based SQLite wrapper using op-sqlite
// Replaces react-native-sqlite-storage for 10x+ performance
// ------------------------------------------------------------

import { open, type DB, type QueryResult } from '@op-engineering/op-sqlite';
import { CONFIG } from '@/constants/config';

// ------------------------------------------------------------
// Types (compatible with old interface)
// ------------------------------------------------------------
export interface ResultSet {
  rows: {
    length: number;
    item: (index: number) => any;
    raw: () => any[]; // Required by repositories
  };
  insertId?: number;
  rowsAffected?: number;
}

export type SQLiteTransaction = {
  executeSql: (
    sql: string,
    params?: any[],
    success?: (tx: SQLiteTransaction, result: ResultSet) => void,
    error?: (tx: SQLiteTransaction, err: any) => void
  ) => void;
};

export type SQLiteDatabase = {
  transaction: (cb: (tx: SQLiteTransaction) => void) => void;
  readTransaction?: (cb: (tx: SQLiteTransaction) => void) => void;
  exec?: (sql: string) => void;
  executeSql: (sql: string, params?: any[]) => Promise<[ResultSet]>;
  close?: () => Promise<void> | void;
};

// ------------------------------------------------------------
// Helper: Convert op-sqlite result to ResultSet format
// ------------------------------------------------------------
function convertToResultSet(result: QueryResult): ResultSet {
  const rowsArray = result.rows ?? [];
  return {
    rows: {
      length: rowsArray.length,
      item: (index: number) => rowsArray[index] ?? null,
      raw: () => rowsArray, // Return raw array of rows
    },
    insertId: result.insertId,
    rowsAffected: result.rowsAffected ?? 0,
  };
}

// ------------------------------------------------------------
// openDatabaseSync (expo-sqlite compatible)
// ------------------------------------------------------------
export async function openDatabaseSync(name: string = CONFIG.DB_SMS): Promise<SQLiteDatabase> {
  const db: DB = open({ name });

  // ✅ ADD WAL CONFIGURATION
  await db.execute('PRAGMA journal_mode = WAL;');
  await db.execute('PRAGMA synchronous = NORMAL;');

  const wrapped: SQLiteDatabase = {
    transaction: (cb) => {
      try {
        db.execute('BEGIN TRANSACTION');

        const tx: SQLiteTransaction = {
          executeSql: async (sql, params = [], success, error) => {
            try {
              const result = await db.execute(sql, params ?? []);
              const resultSet = convertToResultSet(result ?? { rowsAffected: 0, rows: [], insertId: undefined });
              success?.(tx, resultSet);
            } catch (err) {
              error?.(tx, err);
              throw err;
            }
          },
        };

        cb(tx);
        db.execute('COMMIT');
      } catch (err) {
        db.execute('ROLLBACK');
        console.error('Transaction error:', err);
        throw err;
      }
    },

    readTransaction: (cb) => {
      // op-sqlite doesn't differentiate read vs write transactions
      // But we can use the same transaction mechanism
      wrapped.transaction(cb);
    },

    executeSql: async (sql: string, params: any[] = []) => {
      try {
        const result = await db.execute(sql, params);
        return [convertToResultSet(result)];
      } catch (error) {
        console.error('executeSql error:', error);
        throw error;
      }
    },
  };

  // Simple SQL executor for multiple statements
  wrapped.exec = (sql: string) => {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    wrapped.transaction((tx) => {
      statements.forEach((stmt) => {
        tx.executeSql(stmt);
      });
    });
  };

  wrapped.close = async () => {
    try {
      db.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
  };

  return wrapped;
}

// ------------------------------------------------------------
// Convenience alias
// ------------------------------------------------------------
export function openDatabase(name: string = CONFIG.DB_SMS): Promise<SQLiteDatabase> {
  return openDatabaseSync(name);
}
