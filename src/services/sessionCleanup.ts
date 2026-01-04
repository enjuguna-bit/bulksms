// ------------------------------------------------------
// 🧹 src/services/sessionCleanup.ts
// Automated cleanup for expired upload sessions
// ------------------------------------------------------

import SecureStorage from "@/utils/SecureStorage";
import Logger from "@/utils/logger";
import type { ExcelUploadData, UploadHistoryEntry } from "@/types/bulkSms";

// Storage keys (must match uploadPersistence.ts)
const STORAGE_KEYS = {
    CURRENT_UPLOAD: "bulkPro:currentUpload",
    UPLOAD_HISTORY: "bulkPro:uploadHistory",
};

// Cleanup thresholds
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Clean up expired upload sessions
 * Should be called on app startup
 */
export async function cleanupExpiredSessions(): Promise<{
    sessionCleared: boolean;
    historyEntriesRemoved: number;
}> {
    let sessionCleared = false;
    let historyEntriesRemoved = 0;

    try {
        // 1. Check and clear expired current session
        const uploadData = await SecureStorage.getItem(STORAGE_KEYS.CURRENT_UPLOAD);
        if (uploadData) {
            try {
                const parsedData: ExcelUploadData = JSON.parse(uploadData);
                const sessionAge = Date.now() - parsedData.uploadTimestamp;

                if (sessionAge > SESSION_TIMEOUT_MS) {
                    await SecureStorage.removeItem(STORAGE_KEYS.CURRENT_UPLOAD);
                    sessionCleared = true;
                    Logger.info(
                        "SessionCleanup",
                        `Cleaned up expired session: ${parsedData.fileName} (${Math.round(sessionAge / 3600000)}h old)`
                    );
                }
            } catch (parseError) {
                // Corrupted data, remove it
                await SecureStorage.removeItem(STORAGE_KEYS.CURRENT_UPLOAD);
                sessionCleared = true;
                Logger.warn("SessionCleanup", "Removed corrupted session data");
            }
        }

        // 2. Clean up old history entries
        const historyJson = await SecureStorage.getItem(STORAGE_KEYS.UPLOAD_HISTORY);
        if (historyJson) {
            try {
                const history: UploadHistoryEntry[] = JSON.parse(historyJson);
                const now = Date.now();

                const filteredHistory = history.filter((entry) => {
                    const entryAge = now - entry.uploadTimestamp;
                    return entryAge < HISTORY_MAX_AGE_MS;
                });

                historyEntriesRemoved = history.length - filteredHistory.length;

                if (historyEntriesRemoved > 0) {
                    await SecureStorage.setItem(
                        STORAGE_KEYS.UPLOAD_HISTORY,
                        JSON.stringify(filteredHistory)
                    );
                    Logger.info(
                        "SessionCleanup",
                        `Removed ${historyEntriesRemoved} old history entries`
                    );
                }
            } catch (parseError) {
                // Corrupted history, clear it
                await SecureStorage.removeItem(STORAGE_KEYS.UPLOAD_HISTORY);
                Logger.warn("SessionCleanup", "Removed corrupted history data");
            }
        }
    } catch (error) {
        Logger.error("SessionCleanup", "Cleanup failed", error);
    }

    return { sessionCleared, historyEntriesRemoved };
}

/**
 * Force clear all upload-related data
 * Use with caution - clears session and history
 */
export async function clearAllUploadData(): Promise<void> {
    try {
        await SecureStorage.multiRemove([
            STORAGE_KEYS.CURRENT_UPLOAD,
            STORAGE_KEYS.UPLOAD_HISTORY,
        ]);
        Logger.info("SessionCleanup", "Cleared all upload data");
    } catch (error) {
        Logger.error("SessionCleanup", "Failed to clear all upload data", error);
        throw error;
    }
}

/**
 * Get session statistics for debugging
 */
export async function getSessionStats(): Promise<{
    hasActiveSession: boolean;
    sessionAge?: number;
    historyCount: number;
}> {
    let hasActiveSession = false;
    let sessionAge: number | undefined;
    let historyCount = 0;

    try {
        const sessionJson = await SecureStorage.getItem(STORAGE_KEYS.CURRENT_UPLOAD);
        if (sessionJson) {
            const session: ExcelUploadData = JSON.parse(sessionJson);
            hasActiveSession = session.isActive;
            sessionAge = Date.now() - session.uploadTimestamp;
        }

        const historyJson = await SecureStorage.getItem(STORAGE_KEYS.UPLOAD_HISTORY);
        if (historyJson) {
            const history: UploadHistoryEntry[] = JSON.parse(historyJson);
            historyCount = history.length;
        }
    } catch (error) {
        Logger.error("SessionCleanup", "Failed to get session stats", error);
    }

    return { hasActiveSession, sessionAge, historyCount };
}
