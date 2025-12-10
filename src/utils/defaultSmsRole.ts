// ------------------------------------------------------
// 📱 src/utils/defaultSmsRole.ts
// Prompts the user to manage default SMS app settings
// ✅ React Native CLI version (no Expo)
// ------------------------------------------------------

import { Platform, Linking } from 'react-native';
import { smsRole } from '@/native';

/**
 * Prompts the user to set or manage the default SMS app on Android.
 *
 * ✅ Supports Android 10 (API 29) → Android 14 (API 34)
 * ✅ Uses native RoleHelperModule bridge if present
 * ✅ Falls back to system settings when bridge unavailable
 */
export async function promptDefaultSmsRole(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // 🔹 Preferred path — use centralized smsRole wrapper
  const success = await smsRole.requestDefault();
  if (success) return;

  // 🔁 Final fallback — open this app’s system settings
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn('[Default SMS Prompt] Linking fallback failed:', e);
  }
}


