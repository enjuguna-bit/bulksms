import AsyncStorage from "@react-native-async-storage/async-storage";
import { devBypass } from "@/native";

// ---------------------------------------------------------------------------
// 🔐 Storage Keys (Single Source of Truth)
// ---------------------------------------------------------------------------
export const ADMIN_UNLOCK_STORAGE_KEY = "@billing.adminUnlocked";
export const ADMIN_UNLOCK_AT_KEY = "@billing.adminUnlockedAt";
export const DEV_BYPASS_STORAGE_KEY = "DEV_BYPASS_OVERRIDE";

// ---------------------------------------------------------------------------
// ⚙️ Configuration
// ---------------------------------------------------------------------------
const ADMIN_UNLOCK_CODE = "448899"; // 🔐 Change privately
const ADMIN_UNLOCK_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// 🚨 PRODUCTION FLAG - SET TO false BEFORE FINAL RELEASE
export const FORCE_DEV_BYPASS = false;

// ---------------------------------------------------------------------------
// 🧠 Types
// ---------------------------------------------------------------------------
export type BypassSource = 'force_flag' | 'dev_override' | 'admin_unlock' | null;

export interface BypassStatus {
  active: boolean;
  source: BypassSource;
  expiresAt?: number;  // For admin unlock with duration
}

// ---------------------------------------------------------------------------
// 🔐 Admin Unlock Management
// ---------------------------------------------------------------------------

/**
 * Check if admin unlock is currently active (not expired)
 */
export async function isAdminUnlocked(): Promise<boolean> {
  try {
    const [unlocked, unlockedAtRaw] = await Promise.all([
      AsyncStorage.getItem(ADMIN_UNLOCK_STORAGE_KEY),
      AsyncStorage.getItem(ADMIN_UNLOCK_AT_KEY),
    ]);

    if (unlocked !== "1") return false;

    const unlockedAt = unlockedAtRaw ? parseInt(unlockedAtRaw, 10) : 0;
    const now = Date.now();

    // Check if expired
    if (now - unlockedAt >= ADMIN_UNLOCK_DURATION_MS) {
      console.log("[BypassManager] Admin unlock expired, auto-locking");
      await lockAdmin();
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[BypassManager] isAdminUnlocked error:", error);
    return false;
  }
}

/**
 * Attempt to unlock with admin code
 * @returns true if code was correct and unlock succeeded
 */
export async function unlockAdmin(code: string): Promise<boolean> {
  if (code !== ADMIN_UNLOCK_CODE) {
    console.log("[BypassManager] ❌ Wrong admin unlock code");
    return false;
  }

  try {
    const now = Date.now();
    await Promise.all([
      AsyncStorage.setItem(ADMIN_UNLOCK_STORAGE_KEY, "1"),
      AsyncStorage.setItem(ADMIN_UNLOCK_AT_KEY, String(now)),
    ]);
    console.log("[BypassManager] ✅ Admin unlock activated");
    return true;
  } catch (error) {
    console.error("[BypassManager] unlockAdmin error:", error);
    return false;
  }
}

/**
 * Lock admin (remove admin unlock)
 */
export async function lockAdmin(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY),
      AsyncStorage.removeItem(ADMIN_UNLOCK_AT_KEY),
    ]);
    console.log("[BypassManager] 🔒 Admin locked");
  } catch (error) {
    console.warn("[BypassManager] lockAdmin error:", error);
  }
}

/**
 * Get admin unlock expiry timestamp (if active)
 */
export async function getAdminUnlockExpiry(): Promise<number | undefined> {
  try {
    const unlockedAtRaw = await AsyncStorage.getItem(ADMIN_UNLOCK_AT_KEY);
    if (!unlockedAtRaw) return undefined;
    const unlockedAt = parseInt(unlockedAtRaw, 10);
    return unlockedAt + ADMIN_UNLOCK_DURATION_MS;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// 🔧 Developer Bypass Management
// ---------------------------------------------------------------------------

async function persistDevBypassFlag(value: boolean): Promise<void> {
  const tasks: Array<Promise<void>> = [
    AsyncStorage.setItem(DEV_BYPASS_STORAGE_KEY, value ? "true" : "false"),
  ];

  // Sync admin unlock state with dev bypass for consistency
  if (value) {
    tasks.push(AsyncStorage.setItem(ADMIN_UNLOCK_STORAGE_KEY, "1"));
    tasks.push(AsyncStorage.setItem(ADMIN_UNLOCK_AT_KEY, String(Date.now())));
  } else {
    tasks.push(AsyncStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY));
    tasks.push(AsyncStorage.removeItem(ADMIN_UNLOCK_AT_KEY));
  }

  await Promise.all(tasks);
}

export async function enableDeveloperBypass(): Promise<void> {
  await persistDevBypassFlag(true);
  try {
    await devBypass.enable();
  } catch (error) {
    console.warn("[BypassManager] native enable failed", error);
  }
  console.log("[BypassManager] ✅ Developer bypass enabled");
}

export async function disableDeveloperBypass(): Promise<void> {
  await persistDevBypassFlag(false);
  try {
    await devBypass.disable();
  } catch (error) {
    console.warn("[BypassManager] native disable failed", error);
  }
  console.log("[BypassManager] 🔒 Developer bypass disabled");
}

export async function isDeveloperBypassEnabled(): Promise<boolean> {
  try {
    // Check native bridge first
    const nativeValue = await devBypass.isEnabled();
    if (nativeValue) return true;
  } catch (error) {
    console.warn("[BypassManager] native isEnabled failed", error);
  }

  const flagRaw = await AsyncStorage.getItem(DEV_BYPASS_STORAGE_KEY);
  if (flagRaw !== "true") {
    return false;
  }

  // Developer bypass uses same 6h window as admin unlock
  const unlockedAtRaw = await AsyncStorage.getItem(ADMIN_UNLOCK_AT_KEY);
  const unlockedAt = unlockedAtRaw ? parseInt(unlockedAtRaw, 10) : 0;

  if (!unlockedAt || Number.isNaN(unlockedAt)) {
    await persistDevBypassFlag(false);
    return false;
  }

  const expired = Date.now() - unlockedAt >= ADMIN_UNLOCK_DURATION_MS;
  if (expired) {
    console.log("[BypassManager] Dev bypass expired, disabling override");
    await persistDevBypassFlag(false);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// 🎯 Unified Bypass Status (SINGLE SOURCE OF TRUTH)
// ---------------------------------------------------------------------------

/**
 * Get the current bypass status from all sources
 * Priority: FORCE_DEV_BYPASS > dev_override > admin_unlock
 */
export async function getBypassStatus(): Promise<BypassStatus> {
  // 1. Check compile-time force flag (highest priority)
  if (FORCE_DEV_BYPASS) {
    return { active: true, source: 'force_flag' };
  }

  // 2. Check dev override
  const devEnabled = await isDeveloperBypassEnabled();
  if (devEnabled) {
    return { active: true, source: 'dev_override' };
  }

  // 3. Check admin unlock
  const adminActive = await isAdminUnlocked();
  if (adminActive) {
    const expiresAt = await getAdminUnlockExpiry();
    return { active: true, source: 'admin_unlock', expiresAt };
  }

  return { active: false, source: null };
}