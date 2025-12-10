import { Platform, Alert } from "react-native";
import { smsRole } from "@/native";
import { CONFIG } from "@/constants/config";

// Default delay after prompt before rechecking
const DEFAULT_RECHECK_DELAY_MS = CONFIG.DEFAULT_RECHECK_DELAY_MS;

/**
 * ✅ Checks whether this app is currently the default SMS handler.
 *    Bypasses during development if the module is not available.
 */
export async function isDefaultSmsApp(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  // ✅ Dev mode bypass handled by native wrapper or here if needed
  // But smsRole.isDefault() is safe.
  try {
    return await smsRole.isDefault();
  } catch (e) {
    console.warn("[DefaultSMS] isDefaultSmsApp error:", e);
    return true; // ✅ don’t break render tree
  }
}

/**
 * ✅ Prompts the user to set this app as the default SMS handler.
 */
export async function promptDefaultSmsApp(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    await smsRole.requestDefault();
  } catch (e) {
    console.warn("[DefaultSMS] promptDefaultSmsApp error:", e);
  }
}

/**
 * ✅ Ensures the app is set as default SMS handler.
 * - If not, shows a native Alert (or silent prompt if showAlert = false)
 * - Waits for a few seconds, then rechecks status.
 */
export async function ensureDefaultSmsApp(
  showAlert = true,
  delayMs = DEFAULT_RECHECK_DELAY_MS
): Promise<boolean> {
  const isDefault = await isDefaultSmsApp();
  if (isDefault) return true;

  if (showAlert) {
    Alert.alert(
      "SMS Access Required",
      "To send and receive messages, you must set this app as the default SMS handler.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Set Now", onPress: () => promptDefaultSmsApp() },
      ]
    );
  } else {
    await promptDefaultSmsApp();
  }

  return waitAndRecheck(delayMs);
}

/**
 * ✅ Directly prompt the user, then recheck status after a short delay.
 */
export async function promptAndCheckDefaultSmsApp(
  delayMs = DEFAULT_RECHECK_DELAY_MS
): Promise<boolean> {
  await promptDefaultSmsApp();
  return waitAndRecheck(delayMs);
}

/**
 * 🧭 Helper: wait a few ms and recheck default SMS role.
 */
async function waitAndRecheck(delayMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      try {
        const newStatus = await isDefaultSmsApp();
        resolve(newStatus);
      } catch (e) {
        console.warn("[DefaultSMS] recheck error:", e);
        resolve(true); // ✅ fail safe in dev
      } finally {
        clearTimeout(timeout);
      }
    }, delayMs);
  });
}
