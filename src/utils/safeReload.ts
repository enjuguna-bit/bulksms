// ------------------------------------------------------
// ♻️ src/utils/safeReload.ts
// Safe reload helper for React Native CLI (no Expo)
// ------------------------------------------------------

import { DevSettings } from 'react-native';

let isReloading = false;

/**
 * ✅ Safely reloads the app without duplicate triggers.
 * - In dev: uses DevSettings.reload()
 * - In release: restarts JS runtime (fallback via RN bridge)
 * - Guards against double-calls
 */
export async function safeReload(): Promise<void> {
  if (isReloading) return;
  isReloading = true;

  try {
    // 🔹 Development mode — standard reload
    if (__DEV__) {
      console.log('[safeReload] Dev mode — reloading JS');
      DevSettings.reload();
      return;
    }

    // 🔹 Production reload — trigger RN bridge refresh
    console.log('[safeReload] Production reload requested');
    if (typeof global !== 'undefined' && (global as any).HermesInternal) {
      console.log('[safeReload] Hermes detected — forcing JS restart');
      DevSettings.reload(); // works on release Hermes builds
    } else {
      console.log('[safeReload] Non-Hermes build — performing soft restart');
      // lightweight fallback
      setTimeout(() => DevSettings.reload(), 200);
    }
  } catch (err) {
    console.warn('[safeReload] Reload failed:', err);
  } finally {
    isReloading = false;
  }
}
