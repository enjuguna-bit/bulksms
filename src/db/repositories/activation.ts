// -----------------------------------------------------
// src/storage/activationStore.ts — React Native CLI version
// Using op-sqlite for JSI-based performance
// -----------------------------------------------------

import { open, type DB } from '@op-engineering/op-sqlite';

// ✅ Open (or create) local activation database
let db: DB | null = null;

function getDB(): DB {
  if (!db) {
    db = open({ name: 'activation.db' });

    // Create table if it doesn't exist
    db.execute(`CREATE TABLE IF NOT EXISTS activation (
       id INTEGER PRIMARY KEY CHECK (id=1),
       token TEXT,
       trialEnd INTEGER
     );`);
  }
  return db;
}

// =====================================================
// 💾 Save activation token and trialEnd date
// =====================================================
export async function saveActivation(token: string, trialEnd: number) {
  try {
    const database = getDB();
    database.execute(
      'INSERT OR REPLACE INTO activation (id, token, trialEnd) VALUES (1, ?, ?);',
      [token, trialEnd]
    );
  } catch (e) {
    console.error('[activationStore] saveActivation error:', e);
  }
}

// =====================================================
// 📤 Load stored activation data
// =====================================================
export async function loadActivation(): Promise<{ token: string | null; trialEnd: number | null }> {
  try {
    const database = getDB();
    const result = await database.execute('SELECT token, trialEnd FROM activation WHERE id=1;');

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      return {
        token: (row.token as string) ?? null,
        trialEnd: (row.trialEnd as number) ?? null
      };
    }
    return { token: null, trialEnd: null };
  } catch (e) {
    console.error('[activationStore] loadActivation error:', e);
    return { token: null, trialEnd: null };
  }
}

// =====================================================
// 🗑️ Clear stored activation (debug/reset)
// =====================================================
export async function clearActivation() {
  try {
    const database = getDB();
    database.execute('DELETE FROM activation WHERE id=1;');
  } catch (e) {
    console.error('[activationStore] clearActivation error:', e);
  }
}
