import { useState, useRef } from "react";

/**
 * Hook for managing bulk SMS sending state and counters
 * Handles sent/failed/queued counters with proper synchronization
 */
export function useBulkSmsCounters() {
    const [sent, setSent] = useState(0);
    const [failed, setFailed] = useState(0);
    const [queued, setQueued] = useState(0);

    // Refs for performance optimization during sending
    const sentRef = useRef(0);
    const failedRef = useRef(0);
    const queuedRef = useRef(0);

    const resetCounters = () => {
        sentRef.current = 0;
        failedRef.current = 0;
        queuedRef.current = 0;
        setSent(0);
        setFailed(0);
        setQueued(0);
    };

    const incrementSent = () => {
        sentRef.current += 1;
        setSent(sentRef.current);
    };

    const incrementFailed = () => {
        failedRef.current += 1;
        setFailed(failedRef.current);
    };

    const incrementQueued = () => {
        queuedRef.current += 1;
        setQueued(queuedRef.current);
    };

    const flushCounters = () => {
        setSent(sentRef.current);
        setFailed(failedRef.current);
        setQueued(queuedRef.current);
    };

    return {
        sent,
        failed,
        queued,
        sentRef,
        failedRef,
        queuedRef,
        resetCounters,
        incrementSent,
        incrementFailed,
        incrementQueued,
        flushCounters,
    };
}
