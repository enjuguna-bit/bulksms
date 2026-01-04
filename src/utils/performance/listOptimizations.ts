// -------------------------------------------------------------
// 🚀 FlatList Performance Optimization Utilities
// -------------------------------------------------------------
// Reusable optimization configurations for React Native FlatLists

import { ListRenderItemInfo } from 'react-native';

/**
 * Standard optimization props for FlatList with fixed-height items
 * Use this for lists where all items have the same height
 */
export function getFixedHeightListProps(itemHeight: number) {
    return {
        // Calculate item layout for better performance
        getItemLayout: (_data: any, index: number) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
        }),

        // Render fewer items per batch for smoother scrolling
        maxToRenderPerBatch: 10,

        // Update cells in smaller batches
        updateCellsBatchingPeriod: 50,

        // Size of render window (items kept in memory)
        windowSize: 5,

        // Remove clipped subviews for memory efficiency
        removeClippedSubviews: true,

        // Initial number of items to render
        initialNumToRender: 10,
    };
}

/**
 * Optimization props for variable-height items (like chat messages)
 * Use when items have different heights
 */
export function getVariableHeightListProps() {
    return {
        maxToRenderPerBatch: 8,
        updateCellsBatchingPeriod: 100,
        windowSize: 3,
        removeClippedSubviews: false, // Can cause issues with variable heights
        initialNumToRender: 12,
    };
}

/**
 * Optimization props for large datasets (1000+ items)
 * Aggressive optimization for memory efficiency
 */
export function getLargeDatasetListProps(itemHeight?: number) {
    const baseProps = {
        maxToRenderPerBatch: 5,
        updateCellsBatchingPeriod: 50,
        windowSize: 3,
        removeClippedSubviews: true,
        initialNumToRender: 8,
    };

    if (itemHeight) {
        return {
            ...baseProps,
            getItemLayout: (_data: any, index: number) => ({
                length: itemHeight,
                offset: itemHeight * index,
                index,
            }),
        };
    }

    return baseProps;
}

/**
 * Generate optimized keyExtractor
 * Uses item ID if available, falls back to index
 */
export function createKeyExtractor<T extends { id?: number | string }>(
    prefix: string = 'item'
) {
    return (item: T, index: number): string => {
        if (item.id !== undefined) {
            return `${prefix}-${item.id}`;
        }
        return `${prefix}-${index}`;
    };
}

/**
 * Create memoized comparison function for React.memo
 * Only re-renders if specified props change
 */
export function createArePropsEqual<T>(keys: (keyof T)[]) {
    return (prevProps: T, nextProps: T): boolean => {
        for (const key of keys) {
            if (prevProps[key] !== nextProps[key]) {
                return false;
            }
        }
        return true;
    };
}

/**
 * Batch state updates to prevent excessive re-renders
 * Useful for rapidly changing state (like progress updates)
 */
export class BatchedUpdater<T> {
    private pending: T | null = null;
    private timer: NodeJS.Timeout | null = null;
    private readonly delay: number;
    private readonly callback: (value: T) => void;

    constructor(callback: (value: T) => void, delay: number = 100) {
        this.callback = callback;
        this.delay = delay;
    }

    update(value: T): void {
        this.pending = value;

        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
            if (this.pending !== null) {
                this.callback(this.pending);
                this.pending = null;
            }
            this.timer = null;
        }, this.delay);
    }

    flush(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.pending !== null) {
            this.callback(this.pending);
            this.pending = null;
        }
    }

    cancel(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.pending = null;
    }
}

/**
 * Performance monitoring utility
 * Logs render times and identifies slow components
 */
export class PerformanceMonitor {
    private static measurements = new Map<string, number[]>();
    private static readonly MAX_SAMPLES = 100;

    static start(label: string): () => void {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            this.record(label, duration);
        };
    }

    private static record(label: string, duration: number): void {
        const samples = this.measurements.get(label) || [];
        samples.push(duration);

        // Keep only recent samples
        if (samples.length > this.MAX_SAMPLES) {
            samples.shift();
        }

        this.measurements.set(label, samples);

        // Log slow operations (> 16ms = 60fps threshold)
        if (duration > 16) {
            console.warn(`[Performance] Slow operation: ${label} took ${duration.toFixed(2)}ms`);
        }
    }

    static getStats(label: string): {
        avg: number;
        min: number;
        max: number;
        count: number;
    } | null {
        const samples = this.measurements.get(label);
        if (!samples || samples.length === 0) return null;

        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const min = Math.min(...samples);
        const max = Math.max(...samples);

        return { avg, min, max, count: samples.length };
    }

    static logAllStats(): void {
        console.log('[Performance] Stats:');
        this.measurements.forEach((_, label) => {
            const stats = this.getStats(label);
            if (stats) {
                console.log(`  ${label}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, n=${stats.count}`);
            }
        });
    }

    static clear(): void {
        this.measurements.clear();
    }
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor(label: string, enabled: boolean = __DEV__) {
    if (!enabled) return;

    const endMeasure = PerformanceMonitor.start(label);
    return () => endMeasure();
}
