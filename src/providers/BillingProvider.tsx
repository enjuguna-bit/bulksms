// ===========================================================================
// 💳 BillingProvider — 2-Day Trial + Activation Server Lock + Admin Override
// Hybrid Mode: Offline-Friendly + Server-Authoritative (when online-ready)
// React Native CLI / RN 0.76.9 Compatible
// ===========================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import SecureStorage from "@/utils/SecureStorage";

// ---------------------------------------------------------------------------
// Local PlanType (no longer imported from services/activation)
// ---------------------------------------------------------------------------
export type PlanType = "monthly" | "quarterly" | "yearly";

// ---------------------------------------------------------------------------
// 🔐 Persistent Keys
// ---------------------------------------------------------------------------
export const ADMIN_UNLOCK_STORAGE_KEY = "@billing.adminUnlocked";

const K = {
  trialStart: "@billing.trialStart",
  subEnd: "@billing.subEnd",
  lastSeen: "@billing.lastSeen",
  trialEndOverride: "@billing.trialEndOverride",
  activated: "@billing.firstRunActivated",
  adminUnlocked: ADMIN_UNLOCK_STORAGE_KEY,
} as const;

// ---------------------------------------------------------------------------
// ⚙️ Config
// ---------------------------------------------------------------------------
const TRIAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const ADMIN_UNLOCK_CODE = "448899"; // 🔐 Change privately

const HYBRID_LOG_PREFIX = "[BillingProvider]";

// ---------------------------------------------------------------------------
// 🧠 Types
// ---------------------------------------------------------------------------
export type BillingStatus = "none" | "trial" | "active" | "expired" | "loading";

interface BillingContextValue {
  status: BillingStatus;
  isPro: boolean;
  loading: boolean;
  trialEndsAt: number | null;
  subEndsAt: number | null;
  trialDaysLeft: number | null;
  subDaysLeft: number | null;
  trialExpired: boolean;
  subExpired: boolean;
  startTrial: () => Promise<void>;
  purchase: (plan: PlanType) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  unlockAdmin: (code: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// 🧩 Context
// ---------------------------------------------------------------------------
const BillingContext = createContext<BillingContextValue | null>(null);

// ---------------------------------------------------------------------------
// 🧮 Utilities
// ---------------------------------------------------------------------------
const now = () => Date.now();

const safeParseNumber = (raw: string | null): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const daysLeft = (until: number | null): number | null => {
  if (!until) return null;
  const diff = until - now();
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  return d > 0 ? d : 0;
};

const planToMs = (plan: PlanType): number => {
  switch (plan) {
    case "monthly":
      return 30 * 24 * 60 * 60 * 1000;
    case "quarterly":
      return 90 * 24 * 60 * 60 * 1000;
    case "yearly":
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await SecureStorage.getItem(key);
  } catch (e) {
    console.warn(`${HYBRID_LOG_PREFIX} Failed to read ${key}:`, e);
    return null;
  }
}

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await SecureStorage.setItem(key, value);
  } catch (e) {
    console.warn(`${HYBRID_LOG_PREFIX} Failed to write ${key}:`, e);
  }
}

async function safeMultiSet(entries: [string, string][]): Promise<void> {
  try {
    await SecureStorage.multiSet(entries);
  } catch (e) {
    console.warn(`${HYBRID_LOG_PREFIX} multiSet error:`, e);
  }
}

// ---------------------------------------------------------------------------
// 🧱 Provider
// ---------------------------------------------------------------------------
interface Props {
  children: ReactNode;
}

export function BillingProvider({ children }: Props) {
  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null);
  const [subEndsAt, setSubEndsAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const writeLastSeen = useCallback(async (t: number) => {
    await safeSetItem(K.lastSeen, String(t));
  }, []);

  // -------------------------------------------------------------------------
  // 🔒 Server-side Enforcement (HYBRID NO-OP VERSION)
  //
  // For now we do not call activation server, we just pass through local values.
  // When you are ready to integrate phone-based activation, you can reintroduce
  // server calls here using your new services/activation.ts API.
  // -------------------------------------------------------------------------
  const enforceServerLock = useCallback(
    async (localTrialEnd: number | null, localSubEnd: number | null) => {
      // No remote enforcement yet, keep local state.
      return { trialEnd: localTrialEnd, subEnd: localSubEnd };
    },
    []
  );

  // -------------------------------------------------------------------------
  // 🔄 Load Stored State + Hybrid Logic
  // -------------------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [tStartRaw, sEndRaw, lastSeenRaw, overrideRaw, adminRaw] =
        await Promise.all([
          safeGetItem(K.trialStart),
          safeGetItem(K.subEnd),
          safeGetItem(K.lastSeen),
          safeGetItem(K.trialEndOverride),
          safeGetItem(K.adminUnlocked),
        ]);

      const tStart = safeParseNumber(tStartRaw);
      const sEnd = safeParseNumber(sEndRaw);
      const lastSeen = safeParseNumber(lastSeenRaw);
      const override = safeParseNumber(overrideRaw);
      const nowTs = now();

      if (adminRaw === "1") setAdminUnlocked(true);

      let localTrialEnd = override ?? (tStart ? tStart + TRIAL_MS : null);
      let localSubEnd = sEnd ?? null;

      // Basic rollback protection on trial timestamps
      if (lastSeen && lastSeen - nowTs > ROLLBACK_TOLERANCE_MS) {
        console.warn(
          `${HYBRID_LOG_PREFIX} Possible clock rollback detected, forcing expiry of trial.`
        );
        localTrialEnd = nowTs - 1;
      }

      // First-time install
      if (!tStart && !localTrialEnd && !localSubEnd) {
        const start = nowTs;
        const end = start + TRIAL_MS;
        await safeMultiSet([
          [K.trialStart, String(start)],
          [K.trialEndOverride, String(end)],
        ]);
        localTrialEnd = end;
      }

      const { trialEnd: syncedTrialEnd, subEnd: syncedSubEnd } =
        await enforceServerLock(localTrialEnd, localSubEnd);

      setTrialEndsAt(syncedTrialEnd ?? localTrialEnd);
      setSubEndsAt(syncedSubEnd ?? localSubEnd);

      await writeLastSeen(nowTs);
    } catch (e) {
      console.warn(`${HYBRID_LOG_PREFIX} load error:`, e);
      setTrialEndsAt(now() - 1);
      setSubEndsAt(null);
    } finally {
      setLoading(false);
    }
  }, [enforceServerLock, writeLastSeen]);

  useEffect(() => {
    void load();
  }, [load]);

  // -------------------------------------------------------------------------
  // 🧭 Actions
  // -------------------------------------------------------------------------
  const startTrial = useCallback(async () => {
    const existing = safeParseNumber(await safeGetItem(K.trialStart));
    if (!existing) {
      const start = now();
      const end = start + TRIAL_MS;
      await safeMultiSet([
        [K.trialStart, String(start)],
        [K.trialEndOverride, String(end)],
      ]);
    }
    await load();
  }, [load]);

  const purchase = useCallback(
    async (plan: PlanType) => {
      const newEnd = now() + planToMs(plan);
      await safeSetItem(K.subEnd, String(newEnd));
      await load();
    },
    [load]
  );

  const restore = useCallback(load, [load]);
  const refresh = useCallback(load, [load]);

  const unlockAdmin = useCallback(async (code: string) => {
    if (code === ADMIN_UNLOCK_CODE) {
      await safeSetItem(K.adminUnlocked, "1");
      setAdminUnlocked(true);
      console.log(`${HYBRID_LOG_PREFIX} ✅ Admin override activated`);
    } else {
      console.log(`${HYBRID_LOG_PREFIX} ❌ Wrong admin unlock code`);
    }
  }, []);

  // -------------------------------------------------------------------------
  // 🧾 Derived Values
  // -------------------------------------------------------------------------
  const status: BillingStatus = useMemo(() => {
    if (loading) return "loading";
    if (adminUnlocked) return "active";

    const nowTs = now();

    const hasSub = subEndsAt != null && subEndsAt > nowTs;
    const hasTrial = trialEndsAt != null && trialEndsAt > nowTs;

    if (hasSub) return "active";
    if (hasTrial) return "trial";
    if (!trialEndsAt && !subEndsAt) return "none";
    return "expired";
  }, [loading, trialEndsAt, subEndsAt, adminUnlocked]);

  const trialDaysLeft = useMemo(() => daysLeft(trialEndsAt), [trialEndsAt]);
  const subDaysLeft = useMemo(() => daysLeft(subEndsAt), [subEndsAt]);

  const trialExpired = useMemo(
    () => !!trialEndsAt && trialEndsAt <= now(),
    [trialEndsAt]
  );
  const subExpired = useMemo(
    () => !!subEndsAt && subEndsAt <= now(),
    [subEndsAt]
  );

  const isPro = status === "active" || status === "trial";

  // -------------------------------------------------------------------------
  // 🧩 Context Value
  // -------------------------------------------------------------------------
  const value = useMemo<BillingContextValue>(
    () => ({
      status,
      isPro,
      loading,
      trialEndsAt,
      subEndsAt,
      trialDaysLeft,
      subDaysLeft,
      trialExpired,
      subExpired,
      startTrial,
      purchase,
      restore,
      refresh,
      unlockAdmin,
    }),
    [
      status,
      isPro,
      loading,
      trialEndsAt,
      subEndsAt,
      trialDaysLeft,
      subDaysLeft,
      trialExpired,
      subExpired,
      startTrial,
      purchase,
      restore,
      refresh,
      unlockAdmin,
    ]
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// 🪄 Hook
// ---------------------------------------------------------------------------
export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling must be used within BillingProvider");
  }
  return ctx;
}
