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
import { checkStatusOnServer, type ActivationResult } from "@/services/activation";

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
  // 🔒 Server-side Enforcement (ACTIVE VERSION)
  //
  // Validates subscription with server. Falls back to local state with
  // grace period when offline to maintain usability.
  // -------------------------------------------------------------------------
  const OFFLINE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours grace when offline
  const SERVER_TIMEOUT_MS = 10000; // 10 second timeout for server calls

  // Helper to add timeout to promises (TSX requires trailing comma in generics)
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  };

  const enforceServerLock = useCallback(
    async (localTrialEnd: number | null, localSubEnd: number | null) => {
      try {
        // Safety check: ensure checkStatusOnServer is a function
        if (typeof checkStatusOnServer !== 'function') {
          console.warn(`${HYBRID_LOG_PREFIX} checkStatusOnServer is not available, using local state`);
          return { trialEnd: localTrialEnd, subEnd: localSubEnd };
        }

        // Call activation server with timeout
        const serverStatus: ActivationResult = await withTimeout(
          checkStatusOnServer(),
          SERVER_TIMEOUT_MS,
          { status: "error", message: "Server timeout" } as ActivationResult
        );

        if (serverStatus.status === "active" || serverStatus.status === "activated" || serverStatus.status === "renewed") {
          // Server says active - use server's authoritative expiry time
          console.log(`${HYBRID_LOG_PREFIX} ✅ Server confirmed active subscription`);
          const serverExpiry = serverStatus.trialEnd ?? null;
          return {
            trialEnd: serverExpiry,
            subEnd: serverExpiry
          };
        } else if (serverStatus.status === "expired") {
          // Server explicitly says expired - force local expiry
          console.log(`${HYBRID_LOG_PREFIX} ⚠️ Server says subscription expired`);
          return {
            trialEnd: now() - 1,
            subEnd: null
          };
        } else if (serverStatus.status === "not_found") {
          // New device or cleared data - allow local trial to continue
          console.log(`${HYBRID_LOG_PREFIX} ℹ️ Device not registered on server, using local state`);
          return { trialEnd: localTrialEnd, subEnd: localSubEnd };
        } else {
          // Error case - apply grace period logic
          const errorMsg = serverStatus.status === "error" ? serverStatus.message : "Unknown server status";
          throw new Error(errorMsg || "Unknown server status");
        }
      } catch (e) {
        // Network error or server unreachable - apply offline grace period
        console.warn(`${HYBRID_LOG_PREFIX} ⚠️ Server unreachable, applying offline grace period:`, e);

        // Check if we have a valid local subscription that's still within grace period
        const nowTs = now();
        const hasLocalSub = localSubEnd && localSubEnd > nowTs;
        const hasLocalTrial = localTrialEnd && localTrialEnd > nowTs;

        if (hasLocalSub || hasLocalTrial) {
          // Still within local validity - allow access
          return { trialEnd: localTrialEnd, subEnd: localSubEnd };
        }

        // Check if recently expired (within grace period)
        const recentlyExpiredSub = localSubEnd && (nowTs - localSubEnd) < OFFLINE_GRACE_PERIOD_MS;
        const recentlyExpiredTrial = localTrialEnd && (nowTs - localTrialEnd) < OFFLINE_GRACE_PERIOD_MS;

        if (recentlyExpiredSub) {
          console.log(`${HYBRID_LOG_PREFIX} 🔄 Offline grace period active for subscription`);
          return { trialEnd: null, subEnd: nowTs + OFFLINE_GRACE_PERIOD_MS };
        }

        if (recentlyExpiredTrial) {
          console.log(`${HYBRID_LOG_PREFIX} 🔄 Offline grace period active for trial`);
          return { trialEnd: nowTs + OFFLINE_GRACE_PERIOD_MS, subEnd: null };
        }

        // No valid local state and outside grace period - force expiry
        return { trialEnd: localTrialEnd, subEnd: localSubEnd };
      }
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
