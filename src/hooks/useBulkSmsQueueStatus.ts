import { useState, useEffect, useCallback } from "react";
import { getQueueStats, clearExhaustedMessages } from "@/db/repositories/smsQueue";
import { getCircuitBreakerStatus } from "@/background/smsWatcher";

/**
 * Hook for managing bulk SMS queue status and diagnostics
 * Provides real-time queue monitoring with efficient polling
 */
export function useBulkSmsQueueStatus(sending: boolean) {
    const [queueStatus, setQueueStatus] = useState({
        pending: 0,
        failed: 0,
        exhausted: 0,
        circuitBreakerActive: false,
        cooldownRemainingMs: null as number | null,
    });

    const refreshQueueStatus = useCallback(async () => {
        try {
            const stats = await getQueueStats();
            const circuitBreaker = getCircuitBreakerStatus();
            setQueueStatus({
                pending: stats.pending,
                failed: stats.failed,
                exhausted: stats.exhausted,
                circuitBreakerActive: circuitBreaker.isActive,
                cooldownRemainingMs: circuitBreaker.cooldownRemainingMs,
            });
        } catch (err) {
            console.warn('[useBulkSmsQueueStatus] Failed to refresh queue status:', err);
        }
    }, []);

    const clearExhausted = useCallback(async () => {
        try {
            await clearExhaustedMessages();
            await refreshQueueStatus();
        } catch (err) {
            console.warn('[useBulkSmsQueueStatus] Failed to clear exhausted:', err);
        }
    }, [refreshQueueStatus]);

    // Refresh queue status on mount and periodically
    useEffect(() => {
        // Initial refresh
        refreshQueueStatus();

        // Refresh every 10 seconds, but not while actively sending
        const interval = setInterval(() => {
            if (!sending) {
                refreshQueueStatus();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [sending, refreshQueueStatus]);

    return {
        queueStatus,
        refreshQueueStatus,
        clearExhausted,
    };
}
