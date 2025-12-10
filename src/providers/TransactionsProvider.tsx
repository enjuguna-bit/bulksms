// ============================================================================
// 🧾 TransactionsProvider — Global Context for M-PESA Transactions
// Safe, Hardened, Production-Ready Version
// React Native CLI / Expo SDK 52 Compatible
// ============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useTransactions, clearTransactions, initTransactionsDatabase, getTransactions } from "@/db/repositories/transactions";

// ---------------------------------------------------------------------------
// 🧩 Shared Type (Unified with StatsProvider)
// ---------------------------------------------------------------------------
import type { TransactionRecord } from "@/types/TransactionRecord";

interface TransactionsContextValue {
  transactions: TransactionRecord[];
  loading: boolean;
  refresh: () => void;
  clear: () => void;
}

// ---------------------------------------------------------------------------
// 🧠 Context
// ---------------------------------------------------------------------------
const TransactionsContext = createContext<TransactionsContextValue | null>(null);

// ---------------------------------------------------------------------------
// 🛡 Helpers (Guards)
// ---------------------------------------------------------------------------
function sanitizeRecord(row: any): TransactionRecord | null {
  if (!row || typeof row !== "object") return null;

  const rawId = row.id;
  const amt = Number(row.amount);
  const date = new Date(row.dateISO);

  // Invalid numerical date or amount → skip entry
  if (isNaN(amt) || !row.dateISO || isNaN(date.getTime())) return null;

  // Convert ID to string always (SQLite may return numbers or strings)
  const id =
    rawId !== undefined && rawId !== null
      ? String(rawId)
      : String(Date.now());

  return {
    id,
    ref: String(row.ref ?? "").trim(),
    merchant: String(row.merchant ?? "").trim(),
    till: String(row.till ?? "").trim(),
    amount: amt || 0,
    plan: String(row.plan ?? "").trim(),
    dateISO: date.toISOString(),
    rawMessage: String(row.rawMessage ?? "").trim(),
  };
}

// ---------------------------------------------------------------------------
// 🏗 Provider
// ---------------------------------------------------------------------------
export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // 🔁 Load from local DB (guarded)
  // -------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    try {
      const rows = await getTransactions();

      if (!Array.isArray(rows)) {
        console.warn("[TransactionsProvider] Non-array returned");
        setTransactions([]);
        setLoading(false);
        return;
      }

      const cleanRows: TransactionRecord[] = [];

      for (const r of rows) {
        const safe = sanitizeRecord(r);
        if (safe) cleanRows.push(safe);
      }

      // Sort newest first
      cleanRows.sort(
        (a, b) =>
          new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
      );

      setTransactions(cleanRows);
    } catch (err) {
      console.warn("[TransactionsProvider] refresh failed:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // 🧹 Clear all stored transactions
  // -------------------------------------------------------------------------
  const clear = useCallback(async () => {
    try {
      await clearTransactions();
      refresh();
    } catch (err) {
      console.warn("[TransactionsProvider] clear failed:", err);
    }
  }, [refresh]);

  // -------------------------------------------------------------------------
  // 🚀 Initial load + smart background-aware polling
  // -------------------------------------------------------------------------
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isActive = true;

    const startPolling = () => {
      refresh(); // Immediate refresh
      timer = setInterval(() => {
        if (isActive) {
          refresh();
        }
      }, 30000); // Poll every 30 seconds (reduced from 4s for battery life)
    };

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', (state) => {
      isActive = state === 'active';

      if (state === 'active') {
        console.log('[TransactionsProvider] App became active, refreshing and resuming polling');
        refresh(); // Refresh immediately on foreground
        if (!timer) startPolling();
      } else {
        console.log('[TransactionsProvider] App went to background, pausing polling');
        stopPolling(); // Save battery when in background
      }
    });

    // Start polling on mount
    startPolling();

    // Cleanup
    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [refresh]);

  // -------------------------------------------------------------------------
  // 🧩 Context Value
  // -------------------------------------------------------------------------
  const value = useMemo<TransactionsContextValue>(
    () => ({
      transactions,
      loading,
      refresh,
      clear,
    }),
    [transactions, loading, refresh, clear]
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ⚛️ Hook
// ---------------------------------------------------------------------------
export function useTransactionsContext(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error(
      "useTransactionsContext must be used within TransactionsProvider"
    );
  }
  return ctx;
}
