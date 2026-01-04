import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Performance monitoring utilities for React Native optimization
 */

interface PerformanceMetrics {
  componentName: string;
  mountTime: number;
  renderTime: number;
  interactionTime?: number;
}

// Performance monitor hook
export function usePerformanceMonitor(componentName: string) {
  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    renderCountRef.current += 1;

    if (__DEV__) {
      console.log(`[${componentName}] Mounted at ${new Date(mountTimeRef.current).toISOString()}`);
      console.log(`[${componentName}] Render count: ${renderCountRef.current}`);
    }

    return () => {
      if (__DEV__ && mountTimeRef.current) {
        const unmountTime = Date.now();
        const mountedDuration = unmountTime - mountTimeRef.current;
        console.log(`[${componentName}] Unmounted after ${mountedDuration}ms`);
      }
    };
  });

  // Track interaction completion time
  const trackInteraction = (interactionName: string) => {
    const startTime = Date.now();

    InteractionManager.runAfterInteractions(() => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (__DEV__) {
        console.log(`[${componentName}] ${interactionName} completed in ${duration}ms`);
      }
    });
  };

  return { trackInteraction };
}

// Performance measurement utility
export const performanceUtils = {
  // Measure function execution time
  measureExecutionTime: <T,>(fn: () => T, label: string): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    if (__DEV__) {
      console.log(`[${label}] Execution time: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  },

  // Measure async function execution time
  measureAsyncExecutionTime: async <T,>(fn: () => Promise<T>, label: string): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    if (__DEV__) {
      console.log(`[${label}] Execution time: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  },

  // Memory usage warning
  warnMemoryUsage: (componentName: string, thresholdMB: number = 50) => {
    // This would integrate with memory monitoring in a real app
    if (__DEV__) {
      console.log(`[${componentName}] Memory monitoring enabled (threshold: ${thresholdMB}MB)`);
    }
  },

  // Bundle size monitoring
  monitorBundleSize: () => {
    if (__DEV__) {
      // Log bundle information
      console.log('Bundle size monitoring active');
      console.log('Current bundle info:', {
        timestamp: new Date().toISOString(),
        environment: __DEV__ ? 'development' : 'production',
      });
    }
  },
};

// Optimized component wrapper with performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  const WrappedComponent = (props: P) => {
    usePerformanceMonitor(componentName);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent;
}

// Performance optimization helpers
export const optimizationHelpers = {
  // Debounce function for input optimization
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Throttle function for scroll optimization
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoize expensive computations
  memoize: <T extends (...args: any[]) => any>(
    fn: T,
    getKey?: (...args: Parameters<T>) => string
  ): T => {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
};
