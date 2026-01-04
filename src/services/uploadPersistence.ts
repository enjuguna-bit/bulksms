// ------------------------------------------------------
// 📤 src/services/uploadPersistence.ts
// Centralized service for Excel upload session persistence
// Uses SecureStorage (SQLite) for data storage
// ------------------------------------------------------

import SecureStorage from "@/utils/SecureStorage";
import Logger from "@/utils/logger";
import type {
    ExcelUploadData,
    UploadHistoryEntry,
    UploadPersistencePreferences,
} from "@/types/bulkSms";

// Storage keys
const STORAGE_KEYS = {
    CURRENT_UPLOAD: "bulkPro:currentUpload",
    UPLOAD_HISTORY: "bulkPro:uploadHistory",
    PREFERENCES: "bulkPro:uploadPreferences",
};

// Default preferences
const DEFAULT_PREFERENCES: UploadPersistencePreferences = {
    autoSave: true,
    sessionTimeout: 24, // hours
    keepHistory: true,
    maxHistoryEntries: 10,
};

// Session timeout in milliseconds (24 hours default)
const getSessionTimeoutMs = (hours: number) => hours * 60 * 60 * 1000;

/**
 * UploadPersistenceService - Singleton service for managing
 * Excel upload session persistence across app restarts.
 */
class UploadPersistenceService {
    private static instance: UploadPersistenceService;
    private preferences: UploadPersistencePreferences = DEFAULT_PREFERENCES;
    private initialized: boolean = false;

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): UploadPersistenceService {
        if (!UploadPersistenceService.instance) {
            UploadPersistenceService.instance = new UploadPersistenceService();
        }
        return UploadPersistenceService.instance;
    }

    /**
     * Initialize service and load preferences
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const prefsJson = await SecureStorage.getItem(STORAGE_KEYS.PREFERENCES);
            if (prefsJson) {
                this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsJson) };
            }
            this.initialized = true;
            Logger.debug("UploadPersistence", "Service initialized");
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to initialize", error);
            this.preferences = DEFAULT_PREFERENCES;
            this.initialized = true;
        }
    }

    /**
     * Save current upload session
     */
    async saveCurrentUpload(data: ExcelUploadData): Promise<void> {
        try {
            await this.initialize();

            const sessionData: ExcelUploadData = {
                ...data,
                lastAccessed: Date.now(),
                isActive: true,
            };

            await SecureStorage.setItem(
                STORAGE_KEYS.CURRENT_UPLOAD,
                JSON.stringify(sessionData)
            );

            // Add to history if enabled
            if (this.preferences.keepHistory) {
                await this.addToHistory(sessionData);
            }

            Logger.info(
                "UploadPersistence",
                `Saved upload session: ${data.fileName} (${data.validRecords} contacts)`
            );
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to save upload data", error);
            throw error;
        }
    }

    /**
     * Load current upload session
     * Returns null if no session or session expired
     */
    async loadCurrentUpload(): Promise<ExcelUploadData | null> {
        try {
            await this.initialize();

            const data = await SecureStorage.getItem(STORAGE_KEYS.CURRENT_UPLOAD);
            if (!data) return null;

            const parsedData: ExcelUploadData = JSON.parse(data);

            // Check session expiry
            const sessionAge = Date.now() - parsedData.uploadTimestamp;
            const maxAge = getSessionTimeoutMs(this.preferences.sessionTimeout);

            if (sessionAge > maxAge) {
                Logger.info(
                    "UploadPersistence",
                    `Session expired: ${parsedData.fileName} (${Math.round(sessionAge / 3600000)}h old)`
                );
                await this.clearCurrentUpload();
                return null;
            }

            // Update last accessed time
            parsedData.lastAccessed = Date.now();
            await SecureStorage.setItem(
                STORAGE_KEYS.CURRENT_UPLOAD,
                JSON.stringify(parsedData)
            );

            Logger.debug(
                "UploadPersistence",
                `Loaded session: ${parsedData.fileName}`
            );
            return parsedData;
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to load upload data", error);
            return null;
        }
    }

    /**
     * Clear current upload session
     */
    async clearCurrentUpload(): Promise<void> {
        try {
            await SecureStorage.removeItem(STORAGE_KEYS.CURRENT_UPLOAD);
            Logger.info("UploadPersistence", "Cleared current upload session");
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to clear upload data", error);
            throw error;
        }
    }

    /**
     * Add upload to history
     */
    private async addToHistory(data: ExcelUploadData): Promise<void> {
        try {
            const history = await this.getUploadHistory();

            // Create history entry
            const historyEntry: UploadHistoryEntry = {
                ...data,
                completed: false,
                archived: false,
            };

            // Add to front, keeping max entries
            const newHistory = [
                historyEntry,
                ...history.filter((h) => h.fileId !== data.fileId),
            ].slice(0, this.preferences.maxHistoryEntries);

            await SecureStorage.setItem(
                STORAGE_KEYS.UPLOAD_HISTORY,
                JSON.stringify(newHistory)
            );
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to add to history", error);
        }
    }

    /**
     * Get upload history
     */
    async getUploadHistory(): Promise<UploadHistoryEntry[]> {
        try {
            const historyJson = await SecureStorage.getItem(
                STORAGE_KEYS.UPLOAD_HISTORY
            );
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to get upload history", error);
            return [];
        }
    }

    /**
     * Mark upload as completed in history
     */
    async markUploadCompleted(
        fileId: string,
        sentCount: number,
        failedCount: number
    ): Promise<void> {
        try {
            const history = await this.getUploadHistory();
            const updatedHistory = history.map((entry) =>
                entry.fileId === fileId
                    ? {
                        ...entry,
                        completed: true,
                        completedAt: Date.now(),
                        sentCount,
                        failedCount,
                    }
                    : entry
            );

            await SecureStorage.setItem(
                STORAGE_KEYS.UPLOAD_HISTORY,
                JSON.stringify(updatedHistory)
            );

            Logger.info(
                "UploadPersistence",
                `Marked upload ${fileId} as completed (${sentCount} sent, ${failedCount} failed)`
            );
        } catch (error) {
            Logger.error(
                "UploadPersistence",
                "Failed to mark upload completed",
                error
            );
        }
    }

    /**
     * Clear upload history
     */
    async clearHistory(): Promise<void> {
        try {
            await SecureStorage.removeItem(STORAGE_KEYS.UPLOAD_HISTORY);
            Logger.info("UploadPersistence", "Cleared upload history");
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to clear history", error);
            throw error;
        }
    }

    /**
     * Get preferences
     */
    async getPreferences(): Promise<UploadPersistencePreferences> {
        await this.initialize();
        return { ...this.preferences };
    }

    /**
     * Update preferences
     */
    async updatePreferences(
        updates: Partial<UploadPersistencePreferences>
    ): Promise<void> {
        try {
            this.preferences = { ...this.preferences, ...updates };
            await SecureStorage.setItem(
                STORAGE_KEYS.PREFERENCES,
                JSON.stringify(this.preferences)
            );
            Logger.info("UploadPersistence", "Updated preferences", updates);
        } catch (error) {
            Logger.error("UploadPersistence", "Failed to update preferences", error);
            throw error;
        }
    }

    /**
     * Check if there's an active session
     */
    async hasActiveSession(): Promise<boolean> {
        const session = await this.loadCurrentUpload();
        return session !== null && session.isActive;
    }
}

// Export singleton instance
export const uploadPersistence = UploadPersistenceService.getInstance();
export default uploadPersistence;
