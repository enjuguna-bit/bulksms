import { useCallback, useEffect, useState, useMemo } from 'react';
import { AppState } from 'react-native';
import { SecureStorageService } from '@/services/SecureStorageService';
import { getSubscriptionInfo } from '@/services/MpesaSubscriptionService';
import { TimeValidationService } from '@/services/TimeValidationService';
import { subscriptionManager } from '@/services/billing/SubscriptionManager';
import { DeviceBindingService } from '@/services/DeviceBindingService';
import {
    getBypassStatus,
    unlockAdmin as bypassUnlockAdmin,
    type BypassSource,
    ADMIN_UNLOCK_STORAGE_KEY,
    ADMIN_UNLOCK_AT_KEY,
} from '@/services/devBypass';

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const K = {
    trialStart: "@billing.trialStart",
    subEnd: "@billing.subEnd",
    lastSeen: "@billing.lastSeen",
    trialEndOverride: "@billing.trialEndOverride",
    activated: "@billing.firstRunActivated",
    adminUnlocked: ADMIN_UNLOCK_STORAGE_KEY,
    adminUnlockedAt: ADMIN_UNLOCK_AT_KEY,
} as const;

const TRIAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const HYBRID_LOG_PREFIX = "[BillingHook]";
const SYNC_INTERVAL_MS = 3600000; // 1 hour
const MIN_BACKGROUND_SYNC_MS = 86400000; // 24 hours

export type BillingStatus = "none" | "trial" | "active" | "expired" | "loading";
export type PlanType = "daily" | "weekly" | "monthly" | "monthly_premium" | "quarterly" | "yearly";

export interface BillingState {
    status: BillingStatus;
    isPro: boolean;
    loading: boolean;
    trialEndsAt: number | null;
    subEndsAt: number | null;
    trialDaysLeft: number | null;
    subDaysLeft: number | null;
    trialExpired: boolean;
    subExpired: boolean;
    isBypassActive: boolean;
    bypassSource: BypassSource;
    isInGracePeriod: boolean;
    graceDaysRemaining: number | null;
}

export interface BillingActions {
    startTrial: () => Promise<void>;
    purchase: (plan: PlanType) => Promise<void>;
    restore: () => Promise<void>;
    refresh: () => Promise<void>;
    unlockAdmin: (code: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
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
        case "daily": return 1 * 24 * 60 * 60 * 1000;
        case "weekly": return 7 * 24 * 60 * 60 * 1000;
        case "monthly":
        case "monthly_premium": return 30 * 24 * 60 * 60 * 1000;
        case "quarterly": return 90 * 24 * 60 * 60 * 1000;
        case "yearly": return 365 * 24 * 60 * 60 * 1000;
        default: return 0;
    }
};

async function safeGetItem(key: string): Promise<string | null> {
    try {
        return await SecureStorageService.getItem(key);
    } catch (e) {
        console.warn(`${HYBRID_LOG_PREFIX} Failed to read ${key}:`, e);
        return null;
    }
}

async function safeSetItem(key: string, value: string): Promise<void> {
    try {
        await SecureStorageService.setItem(key, value);
    } catch (e) {
        console.warn(`${HYBRID_LOG_PREFIX} Failed to write ${key}:`, e);
    }
}

async function safeMultiSet(entries: [string, string][]): Promise<void> {
    try {
        await SecureStorageService.multiSet(entries);
    } catch (e) {
        console.warn(`${HYBRID_LOG_PREFIX} multiSet error:`, e);
    }
}

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

export function useBillingState(): BillingState & BillingActions {
    const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null);
    const [subEndsAt, setSubEndsAt] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [bypassActive, setBypassActive] = useState(false);
    const [bypassSource, setBypassSource] = useState<BypassSource>(null);
    const [isInGracePeriod, setIsInGracePeriod] = useState(false);
    const [graceDaysRemaining, setGraceDaysRemaining] = useState<number | null>(null);
    const [isForeground, setIsForeground] = useState(true);

    const writeLastSeen = useCallback(async (t: number) => {
        await safeSetItem(K.lastSeen, String(t));
    }, []);

    // -------------------------------------------------------------------------
    // Core Loading Logic
    // -------------------------------------------------------------------------
    const load = useCallback(async () => {
        setLoading(true);

        try {
            // 🕵️ Time Integrity Check
            const timeCheck = await TimeValidationService.validateTimeIntegrity();
            if (!timeCheck.valid) {
                console.warn(`${HYBRID_LOG_PREFIX} 🚫 Security: ${timeCheck.reason}`);
                setTrialEndsAt(now() - 1);
                setSubEndsAt(null);
                setLoading(false);
                return;
            }

            const [tStartRaw, sEndRaw, lastSeenRaw, overrideRaw] =
                await Promise.all([
                    safeGetItem(K.trialStart),
                    safeGetItem(K.subEnd),
                    safeGetItem(K.lastSeen),
                    safeGetItem(K.trialEndOverride),
                ]);

            const tStart = safeParseNumber(tStartRaw);
            const sEnd = safeParseNumber(sEndRaw);
            const lastSeen = safeParseNumber(lastSeenRaw);
            const override = safeParseNumber(overrideRaw);
            const nowTs = now();

            // 🔐 Check bypass status
            const bypass = await getBypassStatus();
            setBypassActive(bypass.active);
            setBypassSource(bypass.source);
            if (bypass.active) {
                console.log(`${HYBRID_LOG_PREFIX} 🔓 Bypass active via: ${bypass.source}`);
            }

            let localTrialEnd = override ?? (tStart ? tStart + TRIAL_MS : null);
            let localSubEnd = sEnd ?? null;

            // -----------------------------------------------------------------------
            // 🔗 Sync with SubscriptionManager (Unified Source)
            // -----------------------------------------------------------------------
            try {
                const subState = await subscriptionManager.getSubscriptionState();

                // Grace period sync
                if (subState.status === 'grace') {
                    setIsInGracePeriod(true);
                    setGraceDaysRemaining(subState.graceDaysRemaining || 0);
                } else {
                    setIsInGracePeriod(false);
                    setGraceDaysRemaining(null);
                }

                if (subState.subscription && subState.status !== 'expired' && subState.status !== 'none') {
                    // If manager has a valid sub, allow it to override local storage if newer
                    const managerExpiry = subState.subscription.expiryAt;

                    // If in grace in the manager, extend effective access in local hook state too
                    // (SubscriptionManager status 'grace' implies the sub is expired but we allow access)
                    // The manager already calculates 'grace', so here we just check if we should extend the date
                    // visual for the user or internal check.
                    const effectiveExpiry = subState.status === 'grace'
                        ? managerExpiry + (3 * 24 * 60 * 60 * 1000)
                        : managerExpiry;

                    if (!localSubEnd || effectiveExpiry > localSubEnd) {
                        console.log(`${HYBRID_LOG_PREFIX} 🔗 Syncing with SubscriptionManager (status: ${subState.status})`);
                        localSubEnd = effectiveExpiry;
                        await safeSetItem(K.subEnd, String(localSubEnd));
                    }
                }
            } catch (managerErr) {
                console.warn(`${HYBRID_LOG_PREFIX} SubscriptionManager sync failed:`, managerErr);
            }

            // -----------------------------------------------------------------------
            // 🔗 Legacy M-PESA Sync (Backward/Double Check)
            // -----------------------------------------------------------------------
            try {
                const mpesaSub = await getSubscriptionInfo();
                if (mpesaSub && mpesaSub.expiryAt > nowTs) {
                    console.log(`${HYBRID_LOG_PREFIX} 🔗 Found active M-PESA subscription, syncing expiry.`);
                    if (!localSubEnd || mpesaSub.expiryAt > localSubEnd) {
                        localSubEnd = mpesaSub.expiryAt;
                        await safeSetItem(K.subEnd, String(localSubEnd));
                    }
                }
            } catch (mpesaErr) {
                console.warn(`${HYBRID_LOG_PREFIX} M-PESA sync failed:`, mpesaErr);
            }

            // -----------------------------------------------------------------------
            // 🛡️ Rollback & Tamper Protection
            // -----------------------------------------------------------------------
            if (lastSeen && lastSeen - nowTs > ROLLBACK_TOLERANCE_MS) {
                console.warn(`${HYBRID_LOG_PREFIX} Possible clock rollback detected, forcing expiry of trial.`);
                localTrialEnd = nowTs - 1;
            }

            // -----------------------------------------------------------------------
            // ✨ First Run / Trial Logic
            // -----------------------------------------------------------------------
            if (!tStart && !localTrialEnd && !localSubEnd) {
                // Check if device used trial before (DeviceBinding check)
                try {
                    const canTrial = await DeviceBindingService.canStartTrial();
                    if (!canTrial.allowed) {
                        console.warn(`${HYBRID_LOG_PREFIX} 🚫 Trial blocked: ${canTrial.reason}`);
                        localTrialEnd = nowTs - 1;
                    } else {
                        // New device, allow trial
                        const start = nowTs;
                        const end = start + TRIAL_MS;
                        await safeMultiSet([
                            [K.trialStart, String(start)],
                            [K.trialEndOverride, String(end)],
                        ]);
                        localTrialEnd = end;
                        await DeviceBindingService.registerTrialOnServer();
                    }
                } catch (deviceErr) {
                    console.error(`${HYBRID_LOG_PREFIX} ⛔ Device binding error:`, deviceErr);
                    localTrialEnd = nowTs - 1; // Fail closed
                }
            }

            setTrialEndsAt(localTrialEnd);
            setSubEndsAt(localSubEnd);

            await writeLastSeen(nowTs);
        } catch (e) {
            console.warn(`${HYBRID_LOG_PREFIX} load error:`, e);
            // Fail closed on general error
            setTrialEndsAt(now() - 1);
            setSubEndsAt(null);
        } finally {
            setLoading(false);
        }
    }, [writeLastSeen]);

    // Track app state changes
    useEffect(() => {
        const handleAppStateChange = (nextAppState: string) => {
            setIsForeground(nextAppState === 'active');
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, []);

    // Periodic sync effect
    useEffect(() => {
        let syncInterval: NodeJS.Timeout;
        let lastSyncTime = 0;

        const syncIfNeeded = () => {
            const now = Date.now();
            const timeSinceLastSync = now - lastSyncTime;
            
            if (isForeground || timeSinceLastSync > MIN_BACKGROUND_SYNC_MS) {
                load();
                lastSyncTime = now;
            }
        };

        syncInterval = setInterval(syncIfNeeded, SYNC_INTERVAL_MS);
        return () => clearInterval(syncInterval);
    }, [load, isForeground]);

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------
    const startTrial = useCallback(async () => {
        const existing = safeParseNumber(await safeGetItem(K.trialStart));
        if (!existing) {
            try {
                const canTrial = await DeviceBindingService.canStartTrial();
                if (!canTrial.allowed) {
                    console.warn(`${HYBRID_LOG_PREFIX} 🚫 startTrial blocked: ${canTrial.reason}`);
                    await load();
                    return;
                }
            } catch (e) {
                console.error(`${HYBRID_LOG_PREFIX} ⛔ Device check failed in startTrial:`, e);
                await load();
                return;
            }

            const start = now();
            const end = start + TRIAL_MS;
            await safeMultiSet([
                [K.trialStart, String(start)],
                [K.trialEndOverride, String(end)],
            ]);
            await DeviceBindingService.registerTrialOnServer();
        }
        await load();
    }, [load]);

    const purchase = useCallback(async (plan: PlanType) => {
        const newEnd = now() + planToMs(plan);
        await safeSetItem(K.subEnd, String(newEnd));
        await load();
    }, [load]);

    const restore = useCallback(load, [load]);
    const refresh = useCallback(load, [load]);

    const unlockAdmin = useCallback(async (code: string) => {
        const success = await bypassUnlockAdmin(code);
        if (success) {
            setBypassActive(true);
            setBypassSource('admin_unlock');
            console.log(`${HYBRID_LOG_PREFIX} ✅ Admin override activated`);
        }
    }, []);

    // -------------------------------------------------------------------------
    // Derived State
    // -------------------------------------------------------------------------
    useEffect(() => {
        void load();
    }, [load]);

    const status: BillingStatus = useMemo(() => {
        if (loading) return "loading";
        if (bypassActive) return "active";

        const nowTs = now();
        const hasSub = subEndsAt != null && subEndsAt > nowTs;
        const hasTrial = trialEndsAt != null && trialEndsAt > nowTs;

        if (hasSub) return "active";
        if (hasTrial) return "trial";
        if (!trialEndsAt && !subEndsAt) return "none";
        return "expired";
    }, [loading, trialEndsAt, subEndsAt, bypassActive]);

    const isPro = status === "active" || status === "trial";

    return {
        status,
        isPro,
        loading,
        trialEndsAt,
        subEndsAt,
        trialDaysLeft: daysLeft(trialEndsAt),
        subDaysLeft: daysLeft(subEndsAt),
        trialExpired: !!trialEndsAt && trialEndsAt <= now(),
        subExpired: !!subEndsAt && subEndsAt <= now(),
        startTrial,
        purchase,
        restore,
        refresh,
        unlockAdmin,
        isBypassActive: bypassActive,
        bypassSource,
        isInGracePeriod,
        graceDaysRemaining,
    };
}
