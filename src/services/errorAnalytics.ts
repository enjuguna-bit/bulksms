/**
 * Error Analytics Manager
 * Provides flexible error reporting with support for Firebase Crashlytics, Sentry, and custom backends
 */

import { AppError } from '@/utils/errors/AppErrors';

export interface ErrorAnalyticsConfig {
  enabled: boolean;
  provider?: 'firebase' | 'sentry' | 'custom' | 'none';
  environment?: 'development' | 'production' | 'staging';
  userId?: string;
  subscriptionStatus?: string;
  deviceId?: string;
}

class ErrorAnalyticsManager {
  private config: ErrorAnalyticsConfig = {
    enabled: !__DEV__, // Enable in production
    provider: 'custom', // Default to custom for now
    environment: __DEV__ ? 'development' : 'production',
  };

  /**
   * Initialize error analytics with configuration
   */
  initialize(config: Partial<ErrorAnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[ErrorAnalytics] Initialized with config:', {
      enabled: this.config.enabled,
      provider: this.config.provider,
      environment: this.config.environment,
    });
  }

  /**
   * Update user context
   */
  setUserContext(userId: string, subscriptionStatus?: string): void {
    this.config.userId = userId;
    this.config.subscriptionStatus = subscriptionStatus;
    
    // If using Firebase Crashlytics
    if (this.config.provider === 'firebase') {
      try {
        // await crashlytics().setUserId(userId);
        // await crashlytics().setAttribute('subscription', subscriptionStatus || 'none');
        console.log('[ErrorAnalytics] Firebase user context set:', userId);
      } catch (err) {
        console.warn('[ErrorAnalytics] Failed to set Firebase user context:', err);
      }
    }

    // If using Sentry
    if (this.config.provider === 'sentry') {
      try {
        // Sentry.setUser({ id: userId });
        // Sentry.setTag('subscription', subscriptionStatus || 'none');
        console.log('[ErrorAnalytics] Sentry user context set:', userId);
      } catch (err) {
        console.warn('[ErrorAnalytics] Failed to set Sentry user context:', err);
      }
    }
  }

  /**
   * Report error to configured analytics service
   */
  async reportError(error: AppError): Promise<boolean> {
    if (!this.config.enabled || this.config.provider === 'none') {
      return false;
    }

    try {
      switch (this.config.provider) {
        case 'firebase':
          return await this.reportToFirebase(error);
        case 'sentry':
          return await this.reportToSentry(error);
        case 'custom':
          return await this.reportToCustomBackend(error);
        default:
          return false;
      }
    } catch (err) {
      console.error('[ErrorAnalytics] Failed to report error:', err);
      return false;
    }
  }

  /**
   * Report error to Firebase Crashlytics
   * Requires: npm install @react-native-firebase/crashlytics
   */
  private async reportToFirebase(error: AppError): Promise<boolean> {
    try {
      // Uncomment when firebase is available
      // import { crashlytics } from '@react-native-firebase/crashlytics';
      // await crashlytics().recordError(
      //   new Error(error.message),
      //   error.type
      // );
      // await crashlytics().setAttributes({
      //   errorType: error.type,
      //   severity: error.severity,
      //   retriable: String(error.retriable),
      //   userId: this.config.userId || 'anonymous',
      //   subscription: this.config.subscriptionStatus || 'none',
      //   environment: this.config.environment,
      // });
      // return true;

      // For now, simulate success
      if (__DEV__) {
        console.log('[ErrorAnalytics] Would report to Firebase:', {
          type: error.type,
          severity: error.severity,
          userId: this.config.userId,
          subscription: this.config.subscriptionStatus,
        });
      }
      return true;
    } catch (err) {
      console.error('[ErrorAnalytics] Firebase reporting failed:', err);
      return false;
    }
  }

  /**
   * Report error to Sentry
   * Requires: npm install @sentry/react-native
   */
  private async reportToSentry(error: AppError): Promise<boolean> {
    try {
      // Uncomment when sentry is available
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(new Error(error.message), {
      //   tags: {
      //     errorType: error.type,
      //     severity: error.severity,
      //     retriable: String(error.retriable),
      //   },
      //   contexts: {
      //     device: {
      //       // Device info from error context
      //     },
      //   },
      //   extra: {
      //     userId: this.config.userId,
      //     subscription: this.config.subscriptionStatus,
      //   },
      //   breadcrumbs: error.context?.breadcrumbs?.slice(-10).map(b => ({
      //     message: b.message,
      //     category: b.category,
      //     timestamp: new Date(b.timestamp).toISOString(),
      //   })),
      // });
      // return true;

      // For now, simulate success
      if (__DEV__) {
        console.log('[ErrorAnalytics] Would report to Sentry:', {
          type: error.type,
          severity: error.severity,
          userId: this.config.userId,
          subscription: this.config.subscriptionStatus,
        });
      }
      return true;
    } catch (err) {
      console.error('[ErrorAnalytics] Sentry reporting failed:', err);
      return false;
    }
  }

  /**
   * Report error to custom backend
   */
  private async reportToCustomBackend(error: AppError): Promise<boolean> {
    try {
      const payload = {
        type: error.type,
        message: error.message,
        severity: error.severity,
        retriable: error.retriable,
        timestamp: Date.now(),
        userId: this.config.userId || 'anonymous',
        subscription: this.config.subscriptionStatus || 'none',
        environment: this.config.environment,
        context: {
          device: error.context?.device,
          route: error.context?.appState?.route,
          breadcrumbs: error.context?.breadcrumbs?.slice(-10),
        },
      };

      // In development, just log the structure
      if (__DEV__) {
        console.log('[ErrorAnalytics] Custom backend payload:', payload);
      } else {
        // In production, would send to backend
        // const response = await fetch('https://your-backend.com/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(payload),
        // });
        // return response.ok;
      }

      return true;
    } catch (err) {
      console.error('[ErrorAnalytics] Custom backend reporting failed:', err);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorAnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.config.provider !== 'none';
  }
}

// Singleton instance
export const errorAnalytics = new ErrorAnalyticsManager();
