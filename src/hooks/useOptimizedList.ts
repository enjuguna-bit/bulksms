/**
 * useOptimizedList.ts - Enhanced list optimization hooks
 * Provides advanced filtering, searching, pagination, and performance tuning
 */

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { FlatList, ListRenderItem } from 'react-native';

interface UseOptimizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
}

export function useOptimizedList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
}: UseOptimizedListProps<T>) {
  const memoizedData = useMemo(() => data, [data]);
  const memoizedRenderItem = useMemo(() => renderItem, [renderItem]);
  const memoizedKeyExtractor = useCallback(keyExtractor, [keyExtractor]);

  const listProps = useMemo(() => ({
    data: memoizedData,
    renderItem: memoizedRenderItem,
    keyExtractor: memoizedKeyExtractor,
    initialNumToRender: 10,
    maxToRenderPerBatch: 10,
    windowSize: 5,
    removeClippedSubviews: true,
    getItemLayout: itemHeight
      ? (data: any, index: number) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })
      : undefined,
  }), [
    memoizedData,
    memoizedRenderItem,
    memoizedKeyExtractor,
    itemHeight,
  ]);

  return listProps;
}

// ============================================================
// Advanced optimization utilities
// ============================================================

interface ListItem {
  id: string | number;
  [key: string]: any;
}

/**
 * useListSearch - Advanced list search with debouncing
 */
export function useListSearch<T extends ListItem>(
  items: T[],
  searchFields: (keyof T)[],
  debounceMs: number = 300
) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timeoutRef.current);
  }, [query, debounceMs]);

  const results = useMemo(() => {
    if (!debouncedQuery) return items;

    const queryLower = debouncedQuery.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) =>
        String(item[field]).toLowerCase().includes(queryLower)
      )
    );
  }, [items, debouncedQuery, searchFields]);

  const clear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    query,
    setQuery,
    results,
    resultsCount: results.length,
    hasResults: results.length > 0,
    clear,
    isSearching: query !== "",
  };
}

/**
 * useGroupedList - Group items by field
 */
export function useGroupedList<T extends ListItem>(
  items: T[],
  groupField: keyof T,
  options: { sortGroups?: boolean } = {}
) {
  const { sortGroups = false } = options;

  const grouped = useMemo(() => {
    const groups = new Map<string, T[]>();

    items.forEach((item) => {
      const key = String(item[groupField]);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    const result = Array.from(groups.entries()).map(([key, value]) => ({
      key,
      data: value,
      count: value.length,
    }));

    if (sortGroups) {
      result.sort((a, b) => a.key.localeCompare(b.key));
    }

    return result;
  }, [items, groupField, sortGroups]);

  return { grouped, groupCount: grouped.length };
}

/**
 * useSectionList - Convert flat list to section format
 */
interface Section<T> {
  title: string;
  data: T[];
  key: string;
}

export function useSectionList<T extends ListItem>(
  items: T[],
  groupField: keyof T,
  options: { sortSections?: boolean } = {}
): Section<T>[] {
  const { sortSections = true } = options;

  return useMemo(() => {
    const grouped = new Map<string, T[]>();

    items.forEach((item) => {
      const key = String(item[groupField]);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });

    const sections = Array.from(grouped.entries()).map(([key, data]) => ({
      key,
      title: key,
      data,
    }));

    if (sortSections) {
      sections.sort((a, b) => a.title.localeCompare(b.title));
    }

    return sections;
  }, [items, groupField, sortSections]);
}

/**
 * useInfiniteList - Infinite scroll list handling
 */
export function useInfiniteList<T extends ListItem>(
  fetchMore: (page: number) => Promise<T[]>,
  pageSize: number = 20
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (isLoadMore = false) => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const newItems = await fetchMore(isLoadMore ? page + 1 : 1);

      if (isLoadMore) {
        setItems((prev) => [...prev, ...newItems]);
        setPage((prev) => prev + 1);
      } else {
        setItems(newItems);
        setPage(1);
      }

      setHasMore(newItems.length === pageSize);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchMore, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(() => load(true), [load]);
  const refresh = useCallback(() => load(false), [load]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    page,
  };
}
