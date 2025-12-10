// ---------------------------------------------------------
// 📱 src/services/permissions.ts
// ✅ Android SMS + Contacts Permission Helpers
// ---------------------------------------------------------
import { PermissionsAndroid, Platform } from "react-native";

// ✅ Fixed type: PermissionsAndroid.Permission is not a valid value type
const PERMISSIONS: (keyof typeof PermissionsAndroid.PERMISSIONS)[] = [
  "READ_SMS",
  "RECEIVE_SMS",
  "SEND_SMS",
  "READ_CONTACTS",
];

/**
 * 📩 Requests core permissions for SMS features:
 * - READ_SMS
 * - RECEIVE_SMS
 * - SEND_SMS
 * - READ_CONTACTS
 *
 * Returns true only if all permissions are granted.
 */
export async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const results = (await PermissionsAndroid.requestMultiple(
      PERMISSIONS.map((perm) => PermissionsAndroid.PERMISSIONS[perm])
    )) as Record<string, string>;

    return PERMISSIONS.every(
      (perm) => results[PermissionsAndroid.PERMISSIONS[perm]] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (e: unknown) {
    console.warn("[Permissions] SMS permission request failed:", e);
    return false;
  }
}

/**
 * 🕵️ Checks if all SMS permissions are already granted (no prompt).
 */
export async function checkSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const checks = await Promise.all(
      PERMISSIONS.map((perm) => PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS[perm]))
    );
    return checks.every(Boolean);
  } catch (e: unknown) {
    console.warn("[Permissions] SMS permission check failed:", e);
    return false;
  }
}

export async function ensureSmsPermissions(): Promise<boolean> {
  const alreadyGranted = await checkSmsPermissions();
  if (alreadyGranted) return true;
  return await requestSmsPermissions();
}

/**
 * ✅ Request all required permissions if not already granted.
 * Returns true if ALL permissions are granted afterward.
 * Alias for ensureSmsPermissions but explicit about request.
 */
export async function checkAndRequestPermissions(): Promise<boolean> {
  return ensureSmsPermissions();
}

/**
 * 🧭 Helper — Checks and returns whether at least one SMS-related permission is granted.
 * Useful to determine if limited functionality can still be offered.
 */
export async function hasPartialSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const smsPerms = [
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    ];
    const statuses = await Promise.all(smsPerms.map((perm) => PermissionsAndroid.check(perm)));
    return statuses.some((s) => s === true);
  } catch (err) {
    console.warn("[Permissions] Partial check error:", err);
    return false;
  }
}
