import { useRef, useReducer, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SmsQueueConfig {
    timeout: number;
    maxRetries: number;
    batchSize: number;
    streamingThreshold: number;
    flushInterval: number;
}

export interface ProcessingResult {
    success: boolean;
    error?: string;
    queued?: boolean;
}

interface QueueState {
    sending: boolean;
    sent: number;
    failed: number;
    queued: number;
    paused: boolean;
}

type QueueAction =
    | { type: 'START' }
    | { type: 'STOP' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'INCREMENT_SENT' }
    | { type: 'INCREMENT_FAILED' }
    | { type: 'INCREMENT_QUEUED' }
    | { type: 'BATCH_UPDATE'; payload: Partial<Pick<QueueState, 'sent' | 'failed' | 'queued'>> }
    | { type: 'RESET' };

// ============================================================================
// Reducer
// ============================================================================

function queueReducer(state: QueueState, action: QueueAction): QueueState {
    switch (action.type) {
        case 'START':
            return { ...state, sending: true, sent: 0, failed: 0, queued: 0, paused: false };
        case 'STOP':
            return { ...state, sending: false, paused: false };
        case 'PAUSE':
            return { ...state, paused: true };
        case 'RESUME':
            return { ...state, paused: false };
        case 'INCREMENT_SENT':
            return { ...state, sent: state.sent + 1 };
        case 'INCREMENT_FAILED':
            return { ...state, failed: state.failed + 1 };
        case 'INCREMENT_QUEUED':
            return { ...state, queued: state.queued + 1 };
        case 'BATCH_UPDATE':
            return {
                ...state,
                sent: action.payload.sent ?? state.sent,
                failed: action.payload.failed ?? state.failed,
                queued: action.payload.queued ?? state.queued,
            };
        case 'RESET':
            return { sending: false, sent: 0, failed: 0, queued: 0, paused: false };
        default:
            return state;
    }
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: SmsQueueConfig = {
    timeout: 10000,           // 10s base timeout (reduced from 15s)
    maxRetries: 3,
    batchSize: 100,           // Process in batches of 100
    streamingThreshold: 1000, // Use streaming for >1000 recipients
    flushInterval: 1000,      // Flush state every 1s for large batches
};

// ============================================================================
// Hook
// ============================================================================

export function useSmsQueue(config: Partial<SmsQueueConfig> = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Use reducer for efficient batch state updates
    const [state, dispatch] = useReducer(queueReducer, {
        sending: false,
        sent: 0,
        failed: 0,
        queued: 0,
        paused: false,
    });

    // Refs for abort control and pause management
    const abortControllerRef = useRef<AbortController | null>(null);
    const pauseResolverRef = useRef<(() => void) | null>(null);

    // Counters for batched updates
    const sentRef = useRef(0);
    const failedRef = useRef(0);
    const queuedRef = useRef(0);
    const lastFlushRef = useRef(0);

    /**
     * Start the queue processing
     */
    const start = useCallback(() => {
        dispatch({ type: 'START' });
        sentRef.current = 0;
        failedRef.current = 0;
        queuedRef.current = 0;
        lastFlushRef.current = Date.now();
        abortControllerRef.current = new AbortController();
    }, []);

    /**
     * Stop/cancel the queue processing
     */
    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        // Resume if paused to unblock the loop
        if (pauseResolverRef.current) {
            pauseResolverRef.current();
            pauseResolverRef.current = null;
        }
        dispatch({ type: 'STOP' });
    }, []);

    /**
     * Toggle pause/resume
     */
    const togglePause = useCallback(() => {
        if (state.paused) {
            dispatch({ type: 'RESUME' });
            if (pauseResolverRef.current) {
                pauseResolverRef.current();
                pauseResolverRef.current = null;
            }
        } else {
            dispatch({ type: 'PAUSE' });
        }
    }, [state.paused]);

    /**
     * Wait for resume if paused
     */
    const waitIfPaused = useCallback(async () => {
        if (!state.paused) return;

        await new Promise<void>((resolve) => {
            pauseResolverRef.current = resolve;
            // Auto-resolve if aborted
            if (abortControllerRef.current?.signal.aborted) {
                resolve();
            }
        });
    }, [state.paused]);

    /**
     * Record a successful send
     */
    const recordSuccess = useCallback(() => {
        sentRef.current += 1;
    }, []);

    /**
     * Record a failed send
     */
    const recordFailure = useCallback(() => {
        failedRef.current += 1;
    }, []);

    /**
     * Record a queued message
     */
    const recordQueued = useCallback(() => {
        queuedRef.current += 1;
    }, []);

    /**
     * Flush state updates if threshold reached
     */
    const flushIfNeeded = useCallback((force: boolean = false) => {
        const now = Date.now();
        const timeDiff = now - lastFlushRef.current;

        if (force || timeDiff >= finalConfig.flushInterval) {
            dispatch({
                type: 'BATCH_UPDATE',
                payload: {
                    sent: sentRef.current,
                    failed: failedRef.current,
                    queued: queuedRef.current,
                },
            });
            lastFlushRef.current = now;
        }
    }, [finalConfig.flushInterval]);

    /**
     * Final flush (call at end of processing)
     */
    const finalFlush = useCallback(() => {
        dispatch({
            type: 'BATCH_UPDATE',
            payload: {
                sent: sentRef.current,
                failed: failedRef.current,
                queued: queuedRef.current,
            },
        });
    }, []);

    /**
     * Get current abort signal
     */
    const getSignal = useCallback(() => {
        return abortControllerRef.current?.signal;
    }, []);

    /**
     * Check if aborted
     */
    const isAborted = useCallback(() => {
        return abortControllerRef.current?.signal.aborted ?? false;
    }, []);

    return {
        // State
        state,
        config: finalConfig,

        // Control methods
        start,
        stop,
        togglePause,
        waitIfPaused,

        // Recording methods
        recordSuccess,
        recordFailure,
        recordQueued,
        flushIfNeeded,
        finalFlush,

        // Abort control
        getSignal,
        isAborted,
    };
}
