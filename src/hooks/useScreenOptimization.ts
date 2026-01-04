/**
 * useScreenOptimization.ts
 * Provides performance optimization utilities for screen components
 * Includes debouncing, memoization, and efficient data handling patterns
 */

import { useCallback, useRef, useEffect, useState } from "react";

// ============================================================
// useDebounce - Debounce hook for search/input fields
// ============================================================
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================
// useThrottle - Throttle hook for frequent events
// ============================================================
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - (now - lastRun.current));
      }
    },
    [callback, delay]
  ) as T;
}

// ============================================================
// useAsync - Handle async operations with loading/error states
// ============================================================
interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
  options?: UseAsyncOptions
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction();
      setState({ data: response, loading: false, error: null });
      options?.onSuccess?.(response);
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, loading: false, error: err });
      options?.onError?.(err);
      return null;
    }
  }, [asyncFunction, options]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute, refetch: execute };
}

// ============================================================
// useLocalCache - Simple in-memory caching for list data
// ============================================================
interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

const globalCache = new Map<string, { data: any; timestamp: number }>();

export function useLocalCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = {}
) {
  const { ttl = 5 * 60 * 1000, maxSize = 50 } = config;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async (forceRefresh = false) => {
    const cached = globalCache.get(key);
    const now = Date.now();

    // Return cached data if valid
    if (cached && !forceRefresh && now - cached.timestamp < ttl) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }

    try {
      setLoading(true);
      const result = await fetchFn();

      // Manage cache size
      if (globalCache.size >= maxSize) {
        const firstKey = globalCache.keys().next().value;
        if (firstKey) globalCache.delete(firstKey);
      }

      globalCache.set(key, { data: result, timestamp: now });
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, maxSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refresh = useCallback(() => fetch(true), [fetch]);
  const clearCache = useCallback(() => globalCache.delete(key), [key]);

  return { data, loading, error, refresh, clearCache };
}

// ============================================================
// useMemoCallback - Callback that only changes when dependencies change
// ============================================================
export function useMemoCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  return useCallback(callback, [callback, ...dependencies]) as T;
}

// ============================================================
// useScrollToTop - Scroll to top functionality with optimization
// ============================================================
export function useScrollToTop() {
  const scrollRef = useRef<any>(null);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollToPosition?.(0);
  }, []);

  return { scrollRef, scrollToTop };
}

// ============================================================
// useRenderCount - Debug hook to track unnecessary renders
// ============================================================
export function useRenderCount(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    if (__DEV__) {
      console.log(`[${componentName}] rendered ${renderCount.current} times`);
    }
  });

  return renderCount.current;
}

// ============================================================
// useListOptimization - Combined optimization for FlatList components
// ============================================================
interface ListOptimizationConfig {
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  removeClippedSubviews?: boolean;
}

export function useListOptimization(
  config: ListOptimizationConfig = {}
) {
  const {
    initialNumToRender = 10,
    maxToRenderPerBatch = 10,
    updateCellsBatchingPeriod = 50,
    removeClippedSubviews = true,
  } = config;

  return {
    initialNumToRender,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    removeClippedSubviews,
    scrollEventThrottle: 16, // Optimize scroll event handling
    bounces: false, // Disable bounce animation for better performance
    scrollIndicatorInsets: { right: 1 }, // Fix indicator jitter
  };
}

// ============================================================
// usePaginationOptimization - Efficient pagination handling
// ============================================================
interface PaginationState {
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function usePaginationOptimization(pageSize: number = 20) {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    hasMore: true,
    isLoadingMore: false,
  });

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.isLoadingMore) return;
    setState((prev) => ({ ...prev, page: prev.page + 1, isLoadingMore: true }));
  }, [state.hasMore, state.isLoadingMore]);

  const setHasMore = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hasMore: value, isLoadingMore: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ page: 1, hasMore: true, isLoadingMore: false });
  }, []);

  return { ...state, loadMore, setHasMore, reset, pageSize };
}
