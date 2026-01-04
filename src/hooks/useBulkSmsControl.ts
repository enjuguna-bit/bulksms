import { useState, useRef, useCallback } from "react";

/**
 * Hook for managing bulk SMS sending control state
 * Handles pause/resume/cancel functionality with proper cleanup
 */
export function useBulkSmsControl() {
    const [sending, setSending] = useState(false);
    const [paused, setPaused] = useState(false);

    // Refs for immediate access during async operations
    const cancelledRef = useRef(false);
    const pausedRef = useRef(false);
    const sendingGateRef = useRef(false);
    const resumeResolverRef = useRef<(() => void) | null>(null);

    const startSending = useCallback(() => {
        if (sendingGateRef.current) return false;

        sendingGateRef.current = true;
        cancelledRef.current = false;
        pausedRef.current = false;
        resumeResolverRef.current = null;

        setSending(true);
        setPaused(false);

        return true;
    }, []);

    const stopSending = useCallback(() => {
        cancelledRef.current = true;

        // If paused when stopping, resolve the pause promise to unblock the loop
        if (pausedRef.current && resumeResolverRef.current) {
            resumeResolverRef.current();
            resumeResolverRef.current = null;
        }

        setSending(false);
        sendingGateRef.current = false;
    }, []);

    const togglePause = useCallback(() => {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);

        // If resuming, resolve the waiting promise
        if (!pausedRef.current && resumeResolverRef.current) {
            resumeResolverRef.current();
            resumeResolverRef.current = null;
        }
    }, []);

    const waitIfPaused = useCallback(async (): Promise<void> => {
        if (pausedRef.current) {
            await new Promise<void>((resolve) => {
                resumeResolverRef.current = resolve;
            });
        }
    }, []);

    const isCancelled = useCallback(() => cancelledRef.current, []);
    const isPaused = useCallback(() => pausedRef.current, []);
    const canSend = useCallback(() => !cancelledRef.current && !sendingGateRef.current, []);

    return {
        sending,
        paused,
        startSending,
        stopSending,
        togglePause,
        waitIfPaused,
        isCancelled,
        isPaused,
        canSend,
        cancelledRef,
        pausedRef,
        sendingGateRef,
    };
}
