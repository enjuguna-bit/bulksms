// ============================================================================
// 📊 StatsProvider — Aggregated KPIs from M-PESA Transactions
// Safe & Stable Version with Core Guards
// React Native CLI / Expo SDK 52 Compatible
// ============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTransactionsContext } from "@/providers/TransactionsProvider";

// ---------------------------------------------------------------------------
// 🧩 Shared Types (Unified with TransactionsProvider)
// ---------------------------------------------------------------------------

import type { TransactionRecord as ImportedTransactionRecord } from "@/types/TransactionRecord";

// Unified type reference
type TransactionRecord = ImportedTransactionRecord;

export interface StatsSnapshot {
  totalTransactions: number;
  totalRevenue: number;
  byPlan: Record<string, number>;
  byMerchant: Record<string, number>;
  todayRevenue: number;
  thisWeekRevenue: number;
  lastTransactionDate?: string | null;
}

interface StatsContextValue {
  stats: StatsSnapshot;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// 📆 Date Helpers
// ---------------------------------------------------------------------------
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getStartOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function isSameWeek(a: Date, b: Date): boolean {
  const aStart = getStartOfWeek(new Date(a));
  const bStart = getStartOfWeek(new Date(b));
  return isSameDay(aStart, bStart);
}

// ---------------------------------------------------------------------------
// 🧠 Context
// ---------------------------------------------------------------------------
const StatsContext = createContext<StatsContextValue | null>(null);

// ---------------------------------------------------------------------------
// 🏗 Provider (Core-Guarded)
// ---------------------------------------------------------------------------
export function StatsProvider({ children }: { children: ReactNode }) {
  const { transactions, loading: txLoading } = useTransactionsContext();

  const [stats, setStats] = useState<StatsSnapshot>({
    totalTransactions: 0,
    totalRevenue: 0,
    byPlan: {},
    byMerchant: {},
    todayRevenue: 0,
    thisWeekRevenue: 0,
    lastTransactionDate: null,
  });

  useEffect(() => {
    if (!transactions?.length) {
      setStats({
        totalTransactions: 0,
        totalRevenue: 0,
        byPlan: {},
        byMerchant: {},
        todayRevenue: 0,
        thisWeekRevenue: 0,
        lastTransactionDate: null,
      });
      return;
    }

    let totalRevenue = 0;
    let todayRevenue = 0;
    let thisWeekRevenue = 0;

    const byPlan: Record<string, number> = {};
    const byMerchant: Record<string, number> = {};
    const now = new Date();

    for (const tx of transactions as TransactionRecord[]) {
      const amt = Number(tx.amount) || 0;
      totalRevenue += amt;

      // Validate date
      const txDate = new Date(tx.dateISO);
      if (isNaN(txDate.getTime())) continue;

      if (isSameDay(now, txDate)) todayRevenue += amt;
      if (isSameWeek(now, txDate)) thisWeekRevenue += amt;

      if (tx.plan) byPlan[tx.plan] = (byPlan[tx.plan] || 0) + amt;
      if (tx.merchant)
        byMerchant[tx.merchant] = (byMerchant[tx.merchant] || 0) + amt;
    }

    const sorted = [...transactions].sort(
      (a, b) =>
        new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    );

    const lastTransactionDate = sorted[0]?.dateISO ?? null;

    setStats({
      totalTransactions: transactions.length,
      totalRevenue,
      byPlan,
      byMerchant,
      todayRevenue,
      thisWeekRevenue,
      lastTransactionDate,
    });
  }, [transactions]);

  const value = useMemo(
    () => ({ stats, loading: txLoading }),
    [stats, txLoading]
  );

  return (
    <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ⚛️ Hook
// ---------------------------------------------------------------------------
export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used within StatsProvider");
  return ctx;
}
