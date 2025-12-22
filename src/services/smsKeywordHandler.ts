// ------------------------------------------------------------
// 📱 src/services/smsKeywordHandler.ts
// ✅ Handles Safaricom keyword events (BAL, STOP, INFO, HELP)
// ------------------------------------------------------------

import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import Logger from "@/utils/logger";

const { SmsListenerModule } = NativeModules;

export interface SmsKeywordEvent {
    phone: string;
    keyword: "BAL" | "STOP" | "INFO" | "HELP";
    action: "balance_request" | "opt_out" | "info_request" | "help_request";
    timestamp: number;
}

export type KeywordHandler = (event: SmsKeywordEvent) => void | Promise<void>;

// Storage for opted-out numbers (in production, use database)
const optedOutNumbers = new Set<string>();

// Registered handlers for keyword events
const keywordHandlers: Map<string, KeywordHandler[]> = new Map();

/**
 * Register a handler for a specific keyword action
 */
export function onKeyword(
    action: SmsKeywordEvent["action"],
    handler: KeywordHandler
): () => void {
    const handlers = keywordHandlers.get(action) || [];
    handlers.push(handler);
    keywordHandlers.set(action, handlers);

    // Return unsubscribe function
    return () => {
        const current = keywordHandlers.get(action) || [];
        keywordHandlers.set(
            action,
            current.filter((h) => h !== handler)
        );
    };
}

/**
 * Check if a number has opted out
 */
export function isOptedOut(phone: string): boolean {
    return optedOutNumbers.has(normalizePhone(phone));
}

/**
 * Add a number to opt-out list
 */
export function addOptOut(phone: string): void {
    optedOutNumbers.add(normalizePhone(phone));
    Logger.info("SmsKeyword", `📵 Added ${phone} to opt-out list`);
}

/**
 * Remove a number from opt-out list (re-subscribe)
 */
export function removeOptOut(phone: string): void {
    optedOutNumbers.delete(normalizePhone(phone));
    Logger.info("SmsKeyword", `✅ Removed ${phone} from opt-out list`);
}

/**
 * Get all opted-out numbers
 */
export function getOptedOutNumbers(): string[] {
    return Array.from(optedOutNumbers);
}

// Simple phone normalization
function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").slice(-9);
}

/**
 * Default handler for keywords - called internally
 */
async function handleKeywordEvent(event: SmsKeywordEvent): Promise<void> {
    Logger.info("SmsKeyword", `🔑 Keyword received: ${event.keyword} from ${event.phone}`);

    // Execute registered handlers
    const handlers = keywordHandlers.get(event.action) || [];
    for (const handler of handlers) {
        try {
            await handler(event);
        } catch (error) {
            Logger.warn("SmsKeyword", `Handler error for ${event.action}`, error);
        }
    }

    // Built-in handling for opt-out
    if (event.action === "opt_out") {
        addOptOut(event.phone);
    }
}

// Event subscription holder
let keywordSubscription: { remove: () => void } | null = null;

/**
 * Initialize keyword event listener
 * Call this once during app startup
 */
export function initKeywordListener(): void {
    if (Platform.OS !== "android" || !SmsListenerModule) {
        Logger.warn("SmsKeyword", "Keyword listener not available (Android only)");
        return;
    }

    if (keywordSubscription) {
        Logger.debug("SmsKeyword", "Keyword listener already initialized");
        return;
    }

    try {
        const eventEmitter = new NativeEventEmitter(SmsListenerModule);
        keywordSubscription = eventEmitter.addListener(
            "onSmsKeyword",
            handleKeywordEvent
        );
        Logger.info("SmsKeyword", "🟢 Keyword listener initialized");
    } catch (error) {
        Logger.warn("SmsKeyword", "Failed to initialize keyword listener", error);
    }
}

/**
 * Cleanup keyword event listener
 * Call this during app shutdown
 */
export function cleanupKeywordListener(): void {
    if (keywordSubscription) {
        keywordSubscription.remove();
        keywordSubscription = null;
        Logger.info("SmsKeyword", "🔴 Keyword listener cleaned up");
    }
}

export default {
    initKeywordListener,
    cleanupKeywordListener,
    onKeyword,
    isOptedOut,
    addOptOut,
    removeOptOut,
    getOptedOutNumbers,
};
