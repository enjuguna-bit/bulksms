// -------------------------------------------------------------
// 📱 App-Wide Error Types and Recovery Strategies
// -------------------------------------------------------------
// Comprehensive error categorization beyond just transactions

import DeviceInfo from 'react-native-device-info';

export enum AppErrorType {
    // Network errors
    NETWORK_OFFLINE = 'NETWORK_OFFLINE',
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    NETWORK_SERVER_ERROR = 'NETWORK_SERVER_ERROR',

    // Permission errors
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    PERMISSION_SMS = 'PERMISSION_SMS',
    PERMISSION_CONTACTS = 'PERMISSION_CONTACTS',
    PERMISSION_STORAGE = 'PERMISSION_STORAGE',

    // Data errors
    DATA_CORRUPT = 'DATA_CORRUPT',
    DATA_MIGRATION_FAILED = 'DATA_MIGRATION_FAILED',
    DATABASE_LOCKED = 'DATABASE_LOCKED',
    STORAGE_FULL = 'STORAGE_FULL',

    // UI/Rendering errors
    UI_RENDER_ERROR = 'UI_RENDER_ERROR',
    UI_NAVIGATION_ERROR = 'UI_NAVIGATION_ERROR',

    // Business logic errors
    SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
    TRIAL_ENDED = 'TRIAL_ENDED',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

    // Startup errors
    STARTUP_DB_INIT_FAILED = 'STARTUP_DB_INIT_FAILED',
    STARTUP_MIGRATION_FAILED = 'STARTUP_MIGRATION_FAILED',
    STARTUP_PERMISSION_DENIED = 'STARTUP_PERMISSION_DENIED',
    STARTUP_TIMEOUT = 'STARTUP_TIMEOUT',

    // System errors
    UNKNOWN = 'UNKNOWN',
}

export interface Breadcrumb {
    timestamp: number;
    category: 'navigation' | 'user_action' | 'network' | 'state_change' | 'log';
    message: string;
    data?: Record<string, any>;
    level: 'debug' | 'info' | 'warning' | 'error';
}

export interface ErrorContext {
    // User actions before error (breadcrumbs)
    breadcrumbs: Breadcrumb[];

    // App state snapshot
    appState?: {
        route: string;
        userId?: string;
        subscription?: string;
        permissions?: string[];
    };

    // Device info
    device?: {
        os: string;
        osVersion: string;
        manufacturer: string;
        model: string;
        appVersion: string;
    };

    // Additional context
    extra?: Record<string, any>;
}

export interface AppError {
    type: AppErrorType;
    message: string;
    stack?: string;
    context?: ErrorContext;
    timestamp: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    retriable: boolean;
}

export enum RecoveryAction {
    RETRY_LAST_ACTION = 'RETRY_LAST_ACTION',
    CLEAR_CACHE = 'CLEAR_CACHE',
    RESET_STATE = 'RESET_STATE',
    RELOAD_APP = 'RELOAD_APP',
    REQUEST_PERMISSION = 'REQUEST_PERMISSION',
    OPEN_SETTINGS = 'OPEN_SETTINGS',
    CONTACT_SUPPORT = 'CONTACT_SUPPORT',
    UPGRADE_SUBSCRIPTION = 'UPGRADE_SUBSCRIPTION',
    DISMISS = 'DISMISS',
}

export interface RecoveryStrategy {
    primary: RecoveryAction;
    secondary?: RecoveryAction[];
    autoRetry?: boolean;
    retryDelayMs?: number;
    description: string;
}

/**
 * Get recovery strategy based on error type
 */
export function getRecoveryStrategy(error: AppError): RecoveryStrategy {
    switch (error.type) {
        case AppErrorType.NETWORK_OFFLINE:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                autoRetry: true,
                retryDelayMs: 5000,
                description: 'Waiting for network connection...',
            };

        case AppErrorType.NETWORK_TIMEOUT:
        case AppErrorType.NETWORK_SERVER_ERROR:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                secondary: [RecoveryAction.CLEAR_CACHE],
                autoRetry: true,
                retryDelayMs: 3000,
                description: 'Retrying with exponential backoff...',
            };

        case AppErrorType.PERMISSION_SMS:
        case AppErrorType.PERMISSION_CONTACTS:
        case AppErrorType.PERMISSION_STORAGE:
        case AppErrorType.PERMISSION_DENIED:
            return {
                primary: RecoveryAction.OPEN_SETTINGS,
                secondary: [RecoveryAction.REQUEST_PERMISSION, RecoveryAction.DISMISS],
                description: 'Grant required permissions in Settings',
            };

        case AppErrorType.DATA_CORRUPT:
            return {
                primary: RecoveryAction.RESET_STATE,
                secondary: [RecoveryAction.CONTACT_SUPPORT],
                description: 'Reset app data to recover (will lose local data)',
            };

        case AppErrorType.DATA_MIGRATION_FAILED:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                secondary: [RecoveryAction.CONTACT_SUPPORT],
                autoRetry: true,
                retryDelayMs: 2000,
                description: 'Retrying database migration...',
            };

        case AppErrorType.DATABASE_LOCKED:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                autoRetry: true,
                retryDelayMs: 2000,
                description: 'Database is busy, retrying...',
            };

        case AppErrorType.STORAGE_FULL:
            return {
                primary: RecoveryAction.CLEAR_CACHE,
                secondary: [RecoveryAction.OPEN_SETTINGS],
                description: 'Free up device storage to continue',
            };

        case AppErrorType.UI_RENDER_ERROR:
        case AppErrorType.UI_NAVIGATION_ERROR:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                secondary: [RecoveryAction.RELOAD_APP],
                description: 'Try reloading the screen',
            };

        case AppErrorType.SUBSCRIPTION_EXPIRED:
        case AppErrorType.TRIAL_ENDED:
            return {
                primary: RecoveryAction.UPGRADE_SUBSCRIPTION,
                secondary: [RecoveryAction.DISMISS],
                description: 'Renew subscription to continue using premium features',
            };

        case AppErrorType.QUOTA_EXCEEDED:
            return {
                primary: RecoveryAction.UPGRADE_SUBSCRIPTION,
                secondary: [RecoveryAction.DISMISS],
                description: 'Upgrade plan for higher message quota',
            };

        case AppErrorType.STARTUP_DB_INIT_FAILED:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                secondary: [RecoveryAction.CLEAR_CACHE, RecoveryAction.RELOAD_APP],
                autoRetry: true,
                retryDelayMs: 2000,
                description: 'Failed to initialize database, retrying...',
            };

        case AppErrorType.STARTUP_MIGRATION_FAILED:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                secondary: [RecoveryAction.CONTACT_SUPPORT],
                autoRetry: true,
                retryDelayMs: 3000,
                description: 'Database migration failed, retrying...',
            };

        case AppErrorType.STARTUP_PERMISSION_DENIED:
            return {
                primary: RecoveryAction.OPEN_SETTINGS,
                secondary: [RecoveryAction.REQUEST_PERMISSION],
                description: 'Critical permissions required to start app',
            };

        case AppErrorType.STARTUP_TIMEOUT:
            return {
                primary: RecoveryAction.RELOAD_APP,
                secondary: [RecoveryAction.CLEAR_CACHE, RecoveryAction.CONTACT_SUPPORT],
                description: 'Startup took too long, try restarting',
            };

        default:
            return {
                primary: RecoveryAction.RETRY_LAST_ACTION,
                secondary: [RecoveryAction.RELOAD_APP, RecoveryAction.CONTACT_SUPPORT],
                description: 'Try again or restart the app',
            };
    }
}

/**
 * Classify error from thrown value
 */
export function classifyAppError(error: unknown, context?: Partial<ErrorContext>): AppError {
    const timestamp = Date.now();

    if (error instanceof Error) {
        const msg = error.message.toUpperCase();

        // Startup errors (check first for context-specific errors)
        if (msg.includes('STARTUP')) {
            if (msg.includes('TIMEOUT')) {
                return {
                    type: AppErrorType.STARTUP_TIMEOUT,
                    message: error.message,
                    stack: error.stack,
                    context: context as ErrorContext,
                    timestamp,
                    severity: 'HIGH',
                    retriable: false,
                };
            }
            if (msg.includes('PERMISSION')) {
                return {
                    type: AppErrorType.STARTUP_PERMISSION_DENIED,
                    message: error.message,
                    stack: error.stack,
                    context: context as ErrorContext,
                    timestamp,
                    severity: 'CRITICAL',
                    retriable: false,
                };
            }
            if (msg.includes('MIGRATION')) {
                return {
                    type: AppErrorType.STARTUP_MIGRATION_FAILED,
                    message: error.message,
                    stack: error.stack,
                    context: context as ErrorContext,
                    timestamp,
                    severity: 'HIGH',
                    retriable: true,
                };
            }
            if (msg.includes('DATABASE') || msg.includes('DB') || msg.includes('INIT')) {
                return {
                    type: AppErrorType.STARTUP_DB_INIT_FAILED,
                    message: error.message,
                    stack: error.stack,
                    context: context as ErrorContext,
                    timestamp,
                    severity: 'CRITICAL',
                    retriable: true,
                };
            }
        }

        // Network errors
        if (msg.includes('NETWORK') || msg.includes('FETCH FAILED') || msg.includes('NO INTERNET')) {
            return {
                type: AppErrorType.NETWORK_OFFLINE,
                message: error.message,
                stack: error.stack,
                context: context as ErrorContext,
                timestamp,
                severity: 'MEDIUM',
                retriable: true,
            };
        }

        if (msg.includes('TIMEOUT') || msg.includes('TIMED OUT')) {
            return {
                type: AppErrorType.NETWORK_TIMEOUT,
                message: error.message,
                stack: error.stack,
                context: context as ErrorContext,
                timestamp,
                severity: 'MEDIUM',
                retriable: true,
            };
        }

        // Database errors
        if (msg.includes('DATABASE') || msg.includes('SQLITE')) {
            if (msg.includes('LOCKED')) {
                return {
                    type: AppErrorType.DATABASE_LOCKED,
                    message: error.message,
                    stack: error.stack,
                    context: context as ErrorContext,
                    timestamp,
                    severity: 'MEDIUM',
                    retriable: true,
                };
            }

            return {
                type: AppErrorType.DATA_CORRUPT,
                message: error.message,
                stack: error.stack,
                context: context as ErrorContext,
                timestamp,
                severity: 'HIGH',
                retriable: false,
            };
        }

        // Permission errors
        if (msg.includes('PERMISSION')) {
            if (msg.includes('SMS')) {
                return {
                    type: AppErrorType.PERMISSION_SMS,
                    message: error.message,
                    stack: error.stack,
                    context: context as ErrorContext,
                    timestamp,
                    severity: 'HIGH',
                    retriable: false,
                };
            }

            return {
                type: AppErrorType.PERMISSION_DENIED,
                message: error.message,
                stack: error.stack,
                context: context as ErrorContext,
                timestamp,
                severity: 'HIGH',
                retriable: false,
            };
        }

        // Storage errors
        if (msg.includes('STORAGE') || msg.includes('DISK FULL')) {
            return {
                type: AppErrorType.STORAGE_FULL,
                message: error.message,
                stack: error.stack,
                context: context as ErrorContext,
                timestamp,
                severity: 'HIGH',
                retriable: false,
            };
        }
    }

    // Default unknown error
    return {
        type: AppErrorType.UNKNOWN,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: context as ErrorContext,
        timestamp,
        severity: 'HIGH',
        retriable: false,
    };
}

/**
 * Get user-friendly action label
 */
export function getActionLabel(action: RecoveryAction): string {
    switch (action) {
        case RecoveryAction.RETRY_LAST_ACTION:
            return 'Try Again';
        case RecoveryAction.CLEAR_CACHE:
            return 'Clear Cache';
        case RecoveryAction.RESET_STATE:
            return 'Reset App Data';
        case RecoveryAction.RELOAD_APP:
            return 'Restart App';
        case RecoveryAction.REQUEST_PERMISSION:
            return 'Grant Permission';
        case RecoveryAction.OPEN_SETTINGS:
            return 'Open Settings';
        case RecoveryAction.CONTACT_SUPPORT:
            return 'Contact Support';
        case RecoveryAction.UPGRADE_SUBSCRIPTION:
            return 'Upgrade Plan';
        case RecoveryAction.DISMISS:
            return 'Dismiss';
        default:
            return 'Continue';
    }
}
