// -------------------------------------------------------------
// 🚀 Startup Error Manager
// -------------------------------------------------------------
// Handles startup-specific error management including:
// - Error classification and categorization
// - Exponential backoff retry logic
// - Offline mode detection
// - Cache fallback for failed startup
// - Recovery action execution

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError, AppErrorType, classifyAppError, getRecoveryStrategy, RecoveryAction } from '@/utils/errors/AppErrors';
import { errorTracking } from '@/services/errorTracking';
import Logger from '@/utils/logger';

// Ensure all Logger methods are implemented
if (!Logger.warn || typeof Logger.warn !== 'function') {
    Logger.warn = (category: string, message: string, data?: any) => {
        console.warn(`[${category}] ${message}`, data);
    };
}

if (!Logger.error || typeof Logger.error !== 'function') {
    Logger.error = (category: string, message: string, data?: any) => {
        console.error(`[${category}] ${message}`, data);
    };
}

if (!Logger.info || typeof Logger.info !== 'function') {
    Logger.info = (category: string, message: string, data?: any) => {
        console.log(`[${category}] ${message}`, data);
    };
}

const STORAGE_KEYS = {
    lastSuccessfulStartup: 'startup:last_successful',
    startupCache: 'startup:cache',
};

// Exponential backoff configuration
const RETRY_CONFIG = {
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 30000, // 30 seconds
    maxRetries: 5,
    backoffMultiplier: 2,
};

// Timeout for entire startup process
const STARTUP_TIMEOUT_MS = 60000; // 60 seconds - increased for slower devices

export interface StartupCache {
    timestamp: number;
    hasMinimumPermissions: boolean;
    dbReady: boolean;
}

export interface RetryContext {
    attempt: number;
    nextDelayMs: number;
    totalElapsedMs: number;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attemptNumber: number): number {
    const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Determine if error should be retried
 */
export function shouldRetry(error: AppError, currentAttempt: number): boolean {
    // Don't retry if we've exceeded max retries
    if (currentAttempt >= RETRY_CONFIG.maxRetries) {
        return false;
    }

    // Retry based on retriable flag and recovery strategy
    if (!error.retriable) {
        return false;
    }

    const strategy = getRecoveryStrategy(error);
    return strategy.autoRetry === true;
}

/**
 * Check if device is offline
 */
export async function checkOfflineMode(): Promise<boolean> {
    try {
        const state = await NetInfo.fetch();
        return !state.isConnected;
    } catch (e) {
        Logger.warn('StartupErrorManager', 'Failed to check network state', e);
        return false; // Assume online if check fails
    }
}

/**
 * Get cached startup data as fallback
 */
export async function getCachedFallback(): Promise<StartupCache | null> {
    try {
        const cacheData = await AsyncStorage.getItem(STORAGE_KEYS.startupCache);
        if (cacheData) {
            return JSON.parse(cacheData);
        }
    } catch (e) {
        Logger.warn('StartupErrorManager', 'Failed to retrieve startup cache', e);
    }
    return null;
}

/**
 * Save successful startup state to cache
 */
export async function saveCachedStartupState(cache: StartupCache): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.startupCache, JSON.stringify(cache));
        await AsyncStorage.setItem(STORAGE_KEYS.lastSuccessfulStartup, Date.now().toString());
    } catch (e) {
        Logger.warn('StartupErrorManager', 'Failed to save startup cache', e);
    }
}

/**
 * Handle startup error - classify and determine recovery
 */
export async function handleStartupError(
    error: unknown,
    context: string
): Promise<AppError> {
    // Add breadcrumb for error
    errorTracking.addBreadcrumb({
        category: 'log',
        message: `Startup error in ${context}`,
        level: 'error',
        data: { context },
    });

    // Classify the error
    const appError = classifyAppError(error, {
        breadcrumbs: [],
        appState: { route: 'startup' },
    });

    // Check if offline
    const isOffline = await checkOfflineMode();
    if (isOffline && appError.type !== AppErrorType.NETWORK_OFFLINE) {
        // Override error type if we detect offline mode
        appError.type = AppErrorType.NETWORK_OFFLINE;
        appError.message = 'Device is offline';
        appError.retriable = true;
    }

    // Report to error tracking
    await errorTracking.reportError(appError);

    Logger.error('StartupErrorManager', `Startup failed at ${context}`, {
        type: appError.type,
        severity: appError.severity,
        retriable: appError.retriable,
        message: appError.message,
    });

    return appError;
}

/**
 * Execute function with exponential backoff retry
 */
export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    onRetry?: (context: RetryContext) => void
): Promise<T> {
    let attempt = 1;
    let totalElapsedMs = 0;
    const startTime = Date.now();

    // Set up startup timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Startup timeout: ${operationName} took longer than ${STARTUP_TIMEOUT_MS}ms`));
        }, STARTUP_TIMEOUT_MS);
    });

    async function executeWithRetryInternal(): Promise<T> {
        while (attempt <= RETRY_CONFIG.maxRetries) {
            try {
                errorTracking.addBreadcrumb({
                    category: 'log',
                    message: `Attempting ${operationName} (attempt ${attempt})`,
                    level: 'info',
                });

                const result = await operation();
                const duration = Date.now() - startTime;
                Logger.info('StartupErrorManager', `${operationName} succeeded on attempt ${attempt}`, { duration });
                return result;

            } catch (error) {
                totalElapsedMs = Date.now() - startTime;

                // Classify error
                const appError = await handleStartupError(error, operationName);

                // Check if we should retry
                if (!shouldRetry(appError, attempt) || attempt >= RETRY_CONFIG.maxRetries) {
                    Logger.error('StartupErrorManager', `${operationName} failed permanently`, {
                        attempt,
                        error: appError.message,
                    });
                    throw appError;
                }

                // Calculate backoff delay
                const nextDelayMs = calculateBackoffDelay(attempt);

                Logger.warn('StartupErrorManager', `${operationName} failed, retrying in ${nextDelayMs}ms`, {
                    attempt,
                    error: appError.message,
                });

                // Notify caller about retry
                if (onRetry) {
                    onRetry({ attempt, nextDelayMs, totalElapsedMs });
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, nextDelayMs));
                
                attempt++;
            }
        }
        
        throw new Error(`${operationName} failed after ${RETRY_CONFIG.maxRetries} attempts`);
    }

    // Race between operation and timeout
    return await Promise.race([
        executeWithRetryInternal(),
        timeoutPromise
    ]);
}

/**
 * Execute recovery action
 */
export async function executeRecoveryAction(action: RecoveryAction): Promise<void> {
    Logger.info('StartupErrorManager', `Executing recovery action: ${action}`);

    errorTracking.addBreadcrumb({
        category: 'user_action',
        message: `Recovery action: ${action}`,
        level: 'info',
    });

    switch (action) {
        case RecoveryAction.CLEAR_CACHE:
            try {
                await AsyncStorage.removeItem(STORAGE_KEYS.startupCache);
                Logger.info('StartupErrorManager', 'Cache cleared');
            } catch (e) {
                Logger.error('StartupErrorManager', 'Failed to clear cache', e);
            }
            break;

        case RecoveryAction.OPEN_SETTINGS:
            try {
                const { Linking } = require('react-native');
                await Linking.openSettings();
            } catch (e) {
                Logger.error('StartupErrorManager', 'Failed to open settings', e);
            }
            break;

        case RecoveryAction.RELOAD_APP:
            try {
                const { DevSettings } = require('react-native');
                if (__DEV__) {
                    DevSettings.reload();
                } else {
                    // In production, we might need a different approach
                    Logger.warn('StartupErrorManager', 'App reload not available in production');
                }
            } catch (e) {
                Logger.error('StartupErrorManager', 'Failed to reload app', e);
            }
            break;

        default:
            Logger.warn('StartupErrorManager', `Unhandled recovery action: ${action}`);
    }
}
