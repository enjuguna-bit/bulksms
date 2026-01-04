// -------------------------------------------------------------
// 🧠 React Memoization Utilities
// -------------------------------------------------------------
// Helper functions for optimizing React component re-renders

import { useRef, useEffect, useMemo, useCallback, DependencyList } from 'react';
import { useState } from 'react';

/**
 * Deep comparison for dependency arrays
 * Use when you need to compare objects/arrays in useMemo/useCallback
 */
export function useDeepCompareMemo<T>(factory: () => T, deps: DependencyList): T {
    const ref = useRef<DependencyList>();
    const signalRef = useRef<number>(0);

    if (!ref.current || !deepEqual(deps, ref.current)) {
        ref.current = deps;
        signalRef.current += 1;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(factory, [signalRef.current]);
}

/**
 * Deep comparison for useCallback
 */
export function useDeepCompareCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: DependencyList
): T {
    const ref = useRef<DependencyList>();
    const signalRef = useRef<number>(0);

    if (!ref.current || !deepEqual(deps, ref.current)) {
        ref.current = deps;
        signalRef.current += 1;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback(callback, [signalRef.current]);
}

/**
 * Deep equality check for objects and arrays
 */
function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

/**
 * Debounced value hook
 * Updates value after delay, reducing re-renders for rapidly changing values
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Previous value hook
 * Returns the previous value of a prop/state
 */
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

/**
 * Mounted state hook
 * Prevents setState on unmounted components
 */
export function useIsMounted(): () => boolean {
    const isMountedRef = useRef<boolean>(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return useCallback(() => isMountedRef.current, []);
}

/**
 * Safe setState that only updates if component is mounted
 */
export function useSafeState<T>(
    initialState: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(initialState);
    const isMounted = useIsMounted();

    const safeSetState = useCallback(
        (value: T | ((prev: T) => T)) => {
            if (isMounted()) {
                setState(value);
            }
        },
        [isMounted]
    );

    return [state, safeSetState];
}

/**
 * Async effect with cleanup
 * Prevents memory leaks from async operations
 */
export function useAsyncEffect(
    effect: (isCancelled: () => boolean) => Promise<void>,
    deps: DependencyList
): void {
    useEffect(() => {
        let cancelled = false;

        effect(() => cancelled);

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/**
 * Throttled callback
 * Limits how often a function can be called
 */
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): T {
    const lastRan = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback(
        ((...args: Parameters<T>) => {
            const now = Date.now();

            if (now - lastRan.current >= delay) {
                callback(...args);
                lastRan.current = now;
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                    callback(...args);
                    lastRan.current = Date.now();
                }, delay - (now - lastRan.current));
            }
        }) as T,
        [callback, delay]
    );
}

/**
 * Memoized component props
 * Creates stable references for props to prevent unnecessary re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
    const callbackRef = useRef<T>(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback(((...args: Parameters<T>) => callbackRef.current(...args)) as T, []); // eslint-disable-line react-hooks/exhaustive-deps
}
