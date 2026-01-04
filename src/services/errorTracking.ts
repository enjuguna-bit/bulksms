// -------------------------------------------------------------
// 📊 Error Tracking Service
// -------------------------------------------------------------
// Captures breadcrumbs, context, and reports errors with offline queueing

import DeviceInfo from 'react-native-device-info';
import { AppError, ErrorContext, Breadcrumb } from '@/utils/errors/AppErrors';
import SecureStorage from '@/utils/SecureStorage';
import Logger from '@/utils/logger';
import { errorAnalytics } from '@/services/errorAnalytics';

const STORAGE_KEYS = {
    offlineQueue: 'error_tracking:offline_queue',
    breadcrumbs: 'error_tracking:breadcrumbs',
};

class ErrorTrackingService {
    private breadcrumbs: Breadcrumb[] = [];
    private readonly MAX_BREADCRUMBS = 50;
    private readonly MAX_OFFLINE_ERRORS = 100;
    private offlineQueue: AppError[] = [];
    private currentRoute: string = 'unknown';

    /**
     * Initialize - load offline queue from storage
     */
    async initialize(): Promise<void> {
        try {
            const queueData = await SecureStorage.getItem(STORAGE_KEYS.offlineQueue);
            if (queueData) {
                this.offlineQueue = JSON.parse(queueData);
                console.log(`[ErrorTracking] Loaded ${this.offlineQueue.length} offline errors`);
            }
        } catch (err) {
            console.error('[ErrorTracking] Failed to load offline queue:', err);
        }
    }

    /**
     * Set current route (for context)
     */
    setCurrentRoute(route: string): void {
        this.currentRoute = route;
        this.addBreadcrumb({
            category: 'navigation',
            message: `Navigated to ${route}`,
            level: 'info',
        });
    }

    /**
     * Add breadcrumb for context tracking
     */
    addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
        const fullBreadcrumb: Breadcrumb = {
            ...breadcrumb,
            timestamp: Date.now(),
        };

        this.breadcrumbs.push(fullBreadcrumb);

        // Keep most recent breadcrumbs
        if (this.breadcrumbs.length > this.MAX_BREADCRUMBS) {
            this.breadcrumbs = this.breadcrumbs.slice(-this.MAX_BREADCRUMBS);
        }

        // Persist breadcrumbs to storage (for crash recovery)
        this.persistBreadcrumbs();
    }

    /**
     * Persist breadcrumbs to storage
     */
    private async persistBreadcrumbs(): Promise<void> {
        try {
            await SecureStorage.setItem(
                STORAGE_KEYS.breadcrumbs,
                JSON.stringify(this.breadcrumbs.slice(-20)) // Keep last 20
            );
        } catch (err) {
            // Silent fail - breadcrumbs are nice to have
        }
    }

    /**
     * Capture detailed error context with user info
     */
    private async captureContext(): Promise<ErrorContext> {
        try {
            const deviceInfo = {
                os: DeviceInfo.getSystemName(),
                osVersion: DeviceInfo.getSystemVersion(),
                manufacturer: await DeviceInfo.getManufacturer(),
                model: DeviceInfo.getModel(),
                appVersion: DeviceInfo.getVersion(),
            };

            // Try to get user context from ErrorAnalytics
            const analyticsConfig = errorAnalytics.getConfig();

            return {
                breadcrumbs: [...this.breadcrumbs],
                device: deviceInfo,
                appState: {
                    route: this.currentRoute,
                    userId: analyticsConfig.userId,
                    subscription: analyticsConfig.subscriptionStatus,
                },
            };
        } catch (err) {
            console.error('[ErrorTracking] Failed to capture context:', err);
            return {
                breadcrumbs: [...this.breadcrumbs],
            };
        }
    }

    /**
     * Report error (with offline queueing)
     */
    async reportError(error: AppError): Promise<void> {
        try {
            // Enrich with context if not already present
            if (!error.context) {
                error.context = await this.captureContext();
            }

            // Try to send to analytics service
            const sent = await this.sendToAnalytics(error);

            if (!sent) {
                // Queue for later if offline
                this.offlineQueue.push(error);
                if (this.offlineQueue.length > this.MAX_OFFLINE_ERRORS) {
                    this.offlineQueue = this.offlineQueue.slice(-this.MAX_OFFLINE_ERRORS);
                }
                await this.persistOfflineQueue();
            }

            // Log locally
            console.error(
                `[ErrorTracking] ${error.severity}: ${error.type}`,
                error.message,
                {
                    breadcrumbs: error.context?.breadcrumbs?.slice(-5).map(b => b.message),
                    device: error.context?.device,
                }
            );
        } catch (err) {
            console.error('[ErrorTracking] Failed to report error:', err);
        }
    }

    /**
     * Send error to analytics service
     */
    private async sendToAnalytics(error: AppError): Promise<boolean> {
        try {
            // Use the ErrorAnalyticsManager to send error
            const sent = await errorAnalytics.reportError(error);
            
            // In development, also log locally
            if (__DEV__) {
                console.log('[ErrorTracking] Error reported via analytics:', {
                    type: error.type,
                    message: error.message,
                    severity: error.severity,
                    userId: error.context?.appState?.userId,
                    subscription: error.context?.appState?.subscription,
                    breadcrumbs: error.context?.breadcrumbs?.slice(-10).map(b => ({
                        time: new Date(b.timestamp).toISOString(),
                        category: b.category,
                        message: b.message,
                    })),
                });
            }

            return sent;
        } catch (err) {
            console.error('[ErrorTracking] Analytics send failed:', err);
            return false;
        }
    }

    /**
     * Persist offline queue to storage
     */
    private async persistOfflineQueue(): Promise<void> {
        try {
            await SecureStorage.setItem(
                STORAGE_KEYS.offlineQueue,
                JSON.stringify(this.offlineQueue)
            );
        } catch (err) {
            console.error('[ErrorTracking] Failed to persist offline queue:', err);
        }
    }

    /**
     * Flush offline queue when connection restored
     */
    async flushOfflineQueue(): Promise<void> {
        if (this.offlineQueue.length === 0) return;

        const errors = [...this.offlineQueue];
        this.offlineQueue = [];

        console.log(`[ErrorTracking] Flushing ${errors.length} offline errors...`);

        for (const error of errors) {
            await this.sendToAnalytics(error);
        }

        await SecureStorage.removeItem(STORAGE_KEYS.offlineQueue);
        console.log('[ErrorTracking] Offline queue flushed');
    }

    /**
     * Clear breadcrumbs (after successful completion)
     */
    clearBreadcrumbs(): void {
        this.breadcrumbs = [];
    }

    /**
     * Get breadcrumb summary for debugging
     */
    getBreadcrumbSummary(): string {
        return this.breadcrumbs
            .slice(-10)
            .map(b => `[${b.category}] ${b.message}`)
            .join('\n');
    }

    /**
     * Get offline queue size
     */
    getOfflineQueueSize(): number {
        return this.offlineQueue.length;
    }

    /**
     * Log user action (convenience wrapper)
     */
    logUserAction(action: string, data?: Record<string, any>): void {
        this.addBreadcrumb({
            category: 'user_action',
            message: action,
            data,
            level: 'info',
        });
    }

    /**
     * Log network request (convenience wrapper)
     */
    logNetworkRequest(url: string, method: string, status?: number): void {
        this.addBreadcrumb({
            category: 'network',
            message: `${method} ${url}`,
            data: { status },
            level: status && status >= 400 ? 'error' : 'info',
        });
    }

    /**
     * Track startup event with duration
     */
    trackStartupEvent(event: string, duration?: number, metadata?: Record<string, any>): void {
        this.addBreadcrumb({
            category: 'state_change',
            message: `Startup: ${event}`,
            data: { duration, ...metadata },
            level: 'info',
        });

        if (duration && duration > 5000) {
            // Log slow operations (>5s)
            Logger.warn('ErrorTracking', `Slow startup operation: ${event}`, { duration });
        }
    }

    /**
     * Track startup error with retry context
     */
    trackStartupError(error: AppError, retryAttempt: number): void {
        this.addBreadcrumb({
            category: 'log',
            message: `Startup error (attempt ${retryAttempt}): ${error.type}`,
            data: {
                type: error.type,
                severity: error.severity,
                retriable: error.retriable,
                attempt: retryAttempt,
            },
            level: 'error',
        });

        // Report error
        this.reportError(error);
    }

    /**
     * Get startup metrics
     */
    getStartupMetrics(): {
        breadcrumbCount: number;
        errorCount: number;
        recentEvents: string[];
    } {
        const errorCount = this.breadcrumbs.filter(b => b.level === 'error').length;
        const recentEvents = this.breadcrumbs
            .slice(-10)
            .filter(b => b.category === 'state_change')
            .map(b => b.message);

        return {
            breadcrumbCount: this.breadcrumbs.length,
            errorCount,
            recentEvents,
        };
    }
}

// Singleton instance
export const errorTracking = new ErrorTrackingService();
