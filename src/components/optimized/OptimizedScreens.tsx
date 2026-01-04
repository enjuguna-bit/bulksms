import React, { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { lazyLoadScreen } from '@/utils/lazyLoading';

// Lazy load the heavy BulkPro screen
const BulkProScreen = lazyLoadScreen(
  () => import('@/screens/main/bulk-pro'),
  'BulkPro'
);

// Loading fallback component
const ScreenLoadingFallback = () => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  }}>
    <ActivityIndicator size="large" color="#43B02A" />
  </View>
);

// Error boundary for screen loading
class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Screen loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || ScreenLoadingFallback;
      return <Fallback />;
    }

    return this.props.children;
  }
}

// Optimized screen wrapper with lazy loading
export const OptimizedBulkProScreen = () => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoadingFallback />}>
      <BulkProScreen />
    </Suspense>
  </ScreenErrorBoundary>
);

// Factory function for creating optimized screens
export const createOptimizedScreen = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  screenName: string,
  LoadingComponent?: React.ComponentType,
  ErrorComponent?: React.ComponentType
) => {
  const LazyScreen = lazyLoadScreen(importFunc, screenName);

  const OptimizedScreen = (props: React.ComponentProps<T>) => (
    <ScreenErrorBoundary fallback={ErrorComponent}>
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : <ScreenLoadingFallback />}>
        <LazyScreen {...props} />
      </Suspense>
    </ScreenErrorBoundary>
  );

  OptimizedScreen.displayName = `Optimized${screenName}`;
  return OptimizedScreen;
};

// Pre-configured optimized screens
export const OptimizedScreens = {
  BulkPro: createOptimizedScreen(
    () => import('@/screens/main/bulk-pro'),
    'BulkPro'
  ),

  Inbox: createOptimizedScreen(
    () => import('@/screens/main/inbox'),
    'Inbox'
  ),

  Dashboard: createOptimizedScreen(
    () => import('@/screens/main/dashboard'),
    'Dashboard'
  ),

  Contacts: createOptimizedScreen(
    () => import('@/screens/contacts/SplitContactsScreen'),
    'Contacts'
  ),
};
