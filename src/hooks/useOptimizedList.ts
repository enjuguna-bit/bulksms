import { useMemo, useCallback } from 'react';
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
