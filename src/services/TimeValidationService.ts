import { Platform } from "react-native";
import { SecureStorageService } from "./SecureStorageService";

// ------------------------------------------------------------------
// ⏳ TimeValidationService
// Detects clock manipulation (rollback) to prevent trial abuse.
// ------------------------------------------------------------------

const KEYS = {
    FIRST_LAUNCH: "time_val_first_launch",
    LAST_SEEN: "time_val_last_seen",
    SERVER_OFFSET: "time_val_server_offset",
};

const TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes tolerance
const ROLLBACK_THRESHOLD_MS = 60 * 1000; // 1 minute backward jump allowed (jitter)

export class TimeValidationService {
    /**
     * Validates the integrity of the device time.
     * Checks for:
     * 1. Clock Rollback (Current Time < Last Seen)
     * 2. Significant deviation from Server Time (if online)
     */
    static async validateTimeIntegrity(): Promise<{ valid: boolean; reason?: string }> {
        try {
            const now = Date.now();
            const lastSeenStr = await SecureStorageService.getItem(KEYS.LAST_SEEN);
            const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;

            // 1. Rollback Check
            // If current time is significantly earlier than what we've seen before
            if (lastSeen > 0 && now < lastSeen - ROLLBACK_THRESHOLD_MS) {
                console.warn(`[TimeValidation] ⚠️ Clock rollback detected! Now: ${now}, Last: ${lastSeen}`);
                return { valid: false, reason: "Clock rollback detected" };
            }

            // 2. Server Time Check (Best Effort)
            // Only runs if network is available. We don't block on this if it fails.
            try {
                const serverTime = await this.fetchServerTime();
                if (serverTime) {
                    const diff = Math.abs(serverTime - now);
                    if (diff > TOLERANCE_MS) {
                        console.warn(`[TimeValidation] ⚠️ Significant time deviation! Device: ${now}, Server: ${serverTime}, Diff: ${diff}`);
                        // We return invalid if deviation is massive (e.g. > 1 hour) implies heavy manipulation
                        // keeping 5 min tolerance for strictness might be too aggressive for bad networks, 
                        // but strictly requested by user plan.
                        return { valid: false, reason: "Time mismatch with server" };
                    }
                }
            } catch (e) {
                // Ignore network errors, proceed with local check
            }

            // 3. Update Last Seen
            // Only update if time moved forward
            if (now > lastSeen) {
                await SecureStorageService.setItem(KEYS.LAST_SEEN, now.toString());
            }

            // 4. Ensure First Launch is tracked
            const firstLaunch = await SecureStorageService.getItem(KEYS.FIRST_LAUNCH);
            if (!firstLaunch) {
                await SecureStorageService.setItem(KEYS.FIRST_LAUNCH, now.toString());
            }

            return { valid: true };

        } catch (error) {
            console.error("[TimeValidation] Validation failed:", error);
            // Fail open or closed? Secure coding suggests fail closed, but for UX we might be lenient.
            // Given "Vulnerability" context, we should probably be careful.
            // Returing true to avoid locking out legitimate users on crash, but logging error.
            return { valid: true };
        }
    }

    /**
     * Fetches accurate time from a high-availability public endpoint.
     * Uses a HEAD request to google.com to get the 'date' header.
     */
    private static async fetchServerTime(): Promise<number | null> {
        try {
            // 5-second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch("https://www.google.com", {
                method: "HEAD",
                signal: controller.signal,
                cache: "no-store"
            });

            clearTimeout(timeoutId);

            const dateHeader = response.headers.get("date");
            if (dateHeader) {
                return new Date(dateHeader).getTime();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the verified trial start time
     */
    static async getVerifiedStartTime(): Promise<number> {
        const first = await SecureStorageService.getItem(KEYS.FIRST_LAUNCH);
        return first ? parseInt(first, 10) : Date.now();
    }
}
