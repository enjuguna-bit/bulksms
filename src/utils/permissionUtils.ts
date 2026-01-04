// ------------------------------------------------------
// 🔧 src/utils/permissionUtils.ts
// ✅ Permission Banner Persistence & Utilities
// ------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_DISMISS_PREFIX = 'permission_banner_dismissed_';
const BANNER_SHOW_COUNT_PREFIX = 'permission_banner_count_';
const MAX_BANNER_SHOWS = 3;

/**
 * 🔍 Check if permission banner should be shown
 * Banner shows max 3 times, then allows permanent dismissal
 */
export async function shouldShowPermissionBanner(bannerKey: string): Promise<boolean> {
    try {
        const dismissKey = `${BANNER_DISMISS_PREFIX}${bannerKey}`;
        const countKey = `${BANNER_SHOW_COUNT_PREFIX}${bannerKey}`;

        // Check if permanently dismissed
        const dismissed = await AsyncStorage.getItem(dismissKey);
        if (dismissed === 'true') {
            return false;
        }

        // Check show count
        const countStr = await AsyncStorage.getItem(countKey);
        const count = countStr ? parseInt(countStr, 10) : 0;

        // Increment show count
        await AsyncStorage.setItem(countKey, String(count + 1));

        return true;
    } catch (err) {
        console.warn('[PermissionUtils] Failed to check banner status:', err);
        return true; // Default to showing banner on error
    }
}

/**
 * ❌ Dismiss permission banner (session-based or permanent)
 */
export async function dismissPermissionBanner(bannerKey: string, permanent: boolean = false): Promise<void> {
    try {
        const dismissKey = `${BANNER_DISMISS_PREFIX}${bannerKey}`;
        const countKey = `${BANNER_SHOW_COUNT_PREFIX}${bannerKey}`;

        if (permanent) {
            // Mark as permanently dismissed
            await AsyncStorage.setItem(dismissKey, 'true');
        } else {
            // Check if we've hit max shows
            const countStr = await AsyncStorage.getItem(countKey);
            const count = countStr ? parseInt(countStr, 10) : 0;

            if (count >= MAX_BANNER_SHOWS) {
                // Automatically permanent dismiss after max shows
                await AsyncStorage.setItem(dismissKey, 'true');
            }
        }
    } catch (err) {
        console.warn('[PermissionUtils] Failed to dismiss banner:', err);
    }
}

/**
 * 🔄 Reset banner dismissal (for testing or user re-request)
 */
export async function resetPermissionBanner(bannerKey: string): Promise<void> {
    try {
        const dismissKey = `${BANNER_DISMISS_PREFIX}${bannerKey}`;
        const countKey = `${BANNER_SHOW_COUNT_PREFIX}${bannerKey}`;

        await AsyncStorage.removeItem(dismissKey);
        await AsyncStorage.removeItem(countKey);
    } catch (err) {
        console.warn('[PermissionUtils] Failed to reset banner:', err);
    }
}

/**
 * 📊 Get banner statistics (for debugging)
 */
export async function getBannerStats(bannerKey: string): Promise<{ dismissed: boolean; showCount: number }> {
    try {
        const dismissKey = `${BANNER_DISMISS_PREFIX}${bannerKey}`;
        const countKey = `${BANNER_SHOW_COUNT_PREFIX}${bannerKey}`;

        const dismissed = (await AsyncStorage.getItem(dismissKey)) === 'true';
        const countStr = await AsyncStorage.getItem(countKey);
        const showCount = countStr ? parseInt(countStr, 10) : 0;

        return { dismissed, showCount };
    } catch (err) {
        console.warn('[PermissionUtils] Failed to get banner stats:', err);
        return { dismissed: false, showCount: 0 };
    }
}
