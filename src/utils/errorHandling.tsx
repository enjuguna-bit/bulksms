import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';

// Error logging utility
export const errorLogger = {
  log: (error: Error, context?: string, extraData?: any) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      extraData,
      timestamp: new Date().toISOString(),
      userAgent: 'ReactNative-BulkSMS',
    };

    console.error('[ErrorLogger]', errorInfo);

    // In production, this would send to error reporting service
    // Example: Sentry, Bugsnag, Firebase Crashlytics
    // errorReportingService.captureException(error, { extra: errorInfo });
  },

  logWarning: (message: string, context?: string, extraData?: any) => {
    console.warn('[ErrorLogger]', { message, context, extraData, timestamp: new Date().toISOString() });
  },

  logInfo: (message: string, context?: string, extraData?: any) => {
    console.info('[ErrorLogger]', { message, context, extraData, timestamp: new Date().toISOString() });
  },
};

// Enhanced error boundary with recovery options
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  goHome?: () => void;
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  goHome
}) => (
  <View style={styles.errorContainer}>
    <View style={styles.errorContent}>
      <AlertTriangle size={48} color="#FF3B30" style={styles.errorIcon} />

      <Text style={styles.errorTitle}>Something went wrong</Text>

      <Text style={styles.errorMessage}>
        We're sorry, but something unexpected happened. Please try again.
      </Text>

      {__DEV__ && (
        <ScrollView style={styles.errorDetails}>
          <Text style={styles.errorText}>
            {error.message}
          </Text>
          {error.stack && (
            <Text style={styles.errorStack}>
              {error.stack}
            </Text>
          )}
        </ScrollView>
      )}

      <View style={styles.errorActions}>
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={resetError}
        >
          <RefreshCw size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {goHome && (
          <TouchableOpacity
            style={[styles.button, styles.homeButton]}
            onPress={goHome}
          >
            <Home size={20} color="#43B02A" />
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  </View>
);

/**
 * Enhanced error boundary with logging and recovery
 */
export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    errorLogger.log(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler() {
  return (error: Error, context?: string) => {
    errorLogger.log(error, context);
    // Could trigger global error state here
  };
}

/**
 * Async error boundary for handling promise rejections
 */
export class AsyncErrorBoundary extends Component<
  { children: ReactNode; onAsyncError?: (error: Error) => void },
  { hasAsyncError: boolean; asyncError?: Error }
> {
  constructor(props: { children: ReactNode; onAsyncError?: (error: Error) => void }) {
    super(props);
    this.state = { hasAsyncError: false };
  }

  componentDidMount() {
    // Catch unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      errorLogger.log(error, 'UnhandledPromiseRejection');

      this.props.onAsyncError?.(error);

      this.setState({
        hasAsyncError: true,
        asyncError: error,
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }

  resetAsyncError = () => {
    this.setState({ hasAsyncError: false, asyncError: undefined });
  };

  render() {
    if (this.state.hasAsyncError && this.state.asyncError) {
      return (
        <DefaultErrorFallback
          error={this.state.asyncError}
          resetError={this.resetAsyncError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Network error handler with retry logic
 */
export class NetworkErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        errorLogger.log(lastError, `${context} (attempt ${attempt}/${maxRetries})`);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError!;
  }

  static isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'Network request failed',
      'timeout',
      'connection',
      'offline',
      'ENOTFOUND',
      'ECONNREFUSED',
    ];

    const message = error.message.toLowerCase();
    return networkErrorMessages.some(keyword => message.includes(keyword));
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: '#8E8E93',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#43B02A',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  homeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#43B02A',
  },
  homeButtonText: {
    color: '#43B02A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
