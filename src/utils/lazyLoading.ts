import { lazy, ComponentType } from 'react';

/**
 * Dynamic import utilities for code splitting and performance optimization
 */

// Lazy load heavy screens with error boundaries
export const lazyLoadScreen = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallbackName?: string
) => {
  return lazy(() =>
    importFunc().catch((error) => {
      console.error(`Failed to load ${fallbackName || 'screen'}:`, error);
      // Return a fallback component
      return {
        default: (() => null) as unknown as T,
      };
    })
  );
};

// Lazy load heavy components
export const lazyLoadComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName?: string
) => {
  return lazy(() =>
    importFunc().catch((error) => {
      console.error(`Failed to load ${componentName || 'component'}:`, error);
      return {
        default: (() => null) as unknown as T,
      };
    })
  );
};

// Lazy load services that are not immediately needed
export const lazyLoadService = <T>(
  importFunc: () => Promise<T>,
  serviceName?: string
): Promise<T> => {
  return importFunc().catch((error) => {
    console.error(`Failed to load ${serviceName || 'service'}:`, error);
    throw error;
  });
};

// Preload critical components (call during app initialization)
export const preloadCriticalComponents = () => {
  // Preload essential screens
  import('@/screens/main/dashboard');
  import('@/screens/main/bulk-pro');
  import('@/screens/main/inbox');

  // Preload critical components
  import('@/components/ui/Button');
  import('@/components/ui/Card');
  import('@/components/ui/ToastProvider');
};

// Lazy load heavy libraries on demand
export const loadHeavyLibrary = {
  // Load Excel processing only when needed
  xlsx: () => import('xlsx'),

  // Load document picker only when needed
  documentPicker: () => import('react-native-document-picker'),

  // Load webview only when needed
  webview: () => import('react-native-webview'),

  // Load calendar only when needed
  calendar: () => import('react-native-calendar-events'),
};

// Bundle size monitoring utility
export const bundleSizeMonitor = {
  // Track bundle size in development
  logBundleSize: () => {
    if (__DEV__) {
      // This would integrate with metro bundle analyzer in a real setup
      console.log('Bundle size monitoring enabled');
    }
  },

  // Warn about large imports
  warnLargeImport: (moduleName: string, sizeKB: number) => {
    if (__DEV__ && sizeKB > 500) {
      console.warn(`Large import detected: ${moduleName} (${sizeKB}KB)`);
    }
  },
};
