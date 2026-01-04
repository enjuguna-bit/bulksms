import { useState, useCallback, useEffect } from "react";

// Startup hooks
import useTrial from "../../hooks/useTrial";
import { usePaymentCapture } from "../../hooks/usePaymentCapture";

// Error handling and validation
import { errorTracking } from "@/services/errorTracking";
import { errorAnalytics } from "@/services/errorAnalytics";
import { classifyAppError, AppError } from "@/utils/errors/AppErrors";
import { executeWithRetry, checkOfflineMode, RetryContext, saveCachedStartupState } from "@/services/StartupErrorManager";
import { verifyNativeLibraries, runQuickValidations, runDetailedValidations } from "@/utils/startupValidation";

// Database and services
import { initDatabase } from "@/db/database";
import { pruneSendLogs } from "@/db/repositories/sendLogs";
import { scheduleBufferProcessing } from "@/services/incomingSmsProcessor";

// Configuration for Cleanup
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

// Lightweight helper for structured logging
function logStartupEvent(event: string, extra?: Record<string, unknown>) {
  console.log(`[Startup] ${event}`, extra ? JSON.stringify(extra) : "");
}

// 🧹 Helper: Cleanup old logs
async function pruneOldLogs() {
  try {
    await pruneSendLogs(LOG_RETENTION_MS);
  } catch (e) {
    console.warn("[Startup] Log cleanup warning:", e);
  }
}

// 📊 Helper: Initialize error analytics with user context
async function initErrorAnalytics() {
  try {
    // Initialize with production configuration
    errorAnalytics.initialize({
      enabled: !__DEV__,
      provider: 'custom', // Start with custom backend, can be switched to firebase/sentry
      environment: __DEV__ ? 'development' : 'production',
    });

    console.log('[Startup] Error analytics initialized');
  } catch (e) {
    console.warn("[Startup] Error analytics initialization failed:", e);
    // Don't throw - analytics is optional
  }
}

export interface StartupState {
  ready: boolean;
  initError: AppError | null;
  isOffline: boolean;
  retryContext: RetryContext | null;
  startTime: number;
}

export function useStartupLoader() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<AppError | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [retryContext, setRetryContext] = useState<RetryContext | null>(null);
  const [startTime] = useState(() => Date.now());

  // Run startup hooks once
  useTrial();
  usePaymentCapture();

  const prepareApp = useCallback(async () => {
    setInitError(null);
    setIsOffline(false);
    setRetryContext(null);

    try {
      // Check offline mode first
      const offline = await checkOfflineMode();
      setIsOffline(offline);

      if (offline) {
        errorTracking.trackStartupEvent('offline_detected');
        logStartupEvent("offline_mode_active");
        // ⚡ CHANGE: Do not block startup on offline. Application is offline-first.
      }

      logStartupEvent("initializing_db");
      errorTracking.trackStartupEvent('db_init_started');
      const dbStartTime = Date.now();

      // 🛠 CRITICAL: Verify native libraries before database operations
      const libCheck = await verifyNativeLibraries();
      if (!libCheck.valid) {
        throw new Error(`Native library verification failed: ${libCheck.error}`);
      }

      // ⚡ FIX: Wait for DB with exponential backoff retry
      await executeWithRetry(
        async () => await initDatabase(),
        'database_initialization',
        (context) => {
          // Update retry context in UI
          setRetryContext(context);
          errorTracking.trackStartupEvent('db_init_retry', undefined, { attempt: context.attempt });
        }
      );

      const dbDuration = Date.now() - dbStartTime;
      errorTracking.trackStartupEvent('db_init_completed', dbDuration);

      // ⚡ PERFORMANCE FIX: Run cleanup in background (setTimeout)
      // instead of awaiting it. This unblocks the splash screen immediately.
      setTimeout(() => {
        pruneOldLogs();
      }, 3000);

      // ⚡ QUICK VALIDATION: Only check critical tables (non-blocking)
      logStartupEvent("running_quick_validation");
      errorTracking.trackStartupEvent('validation_started');
      const validationStartTime = Date.now();

      const quickValidation = await runQuickValidations();
      const validationDuration = Date.now() - validationStartTime;
      errorTracking.trackStartupEvent('quick_validation_completed', validationDuration, {
        valid: quickValidation.valid,
      });

      if (!quickValidation.valid) {
        // Critical tables missing - this is a real error
        throw new Error(`Critical database tables missing: ${quickValidation.missingCriticalTables?.join(', ') || ''}`);
      }

      // ⚡ PERFORMANCE: Run detailed validations in background (non-blocking)
      setTimeout(async () => {
        logStartupEvent("running_detailed_validation_background");
        const detailedResults = await runDetailedValidations();
        if (!detailedResults.valid) {
          console.warn('[Startup] Background validation issues detected:', detailedResults);
          errorTracking.trackStartupEvent('detailed_validation_failed', undefined, {
            results: detailedResults.results,
          });
        } else {
          errorTracking.trackStartupEvent('detailed_validation_passed');
        }
      }, 2000); // Run after 2 seconds

      // ⚡ NEW: Progressive permission requests - essential first
      logStartupEvent("requesting_essential_permissions");
      errorTracking.trackStartupEvent('permissions_requested');

      // Import at top of file will be added
      const { PermissionManager } = await import('@/services/PermissionManager');
      const permManager = PermissionManager.getInstance();

      // Request only essential permissions (SEND_SMS, READ_SMS)
      const essential = await permManager.requestEssentialPermissions();

      if (!essential.hasMinimum) {
        // User denied SEND_SMS - cannot proceed
        logStartupEvent("essential_permissions_denied", {
          denied: essential.deniedPermissions
        });

        // Show rationale and prompt settings if needed
        const strategy = await permManager.getDenialStrategy('SEND_SMS');
        if (strategy === 'prompt_settings') {
          await permManager.promptSettings('SEND_SMS');
        }

        // Continue anyway - will show permission banner in app
      } else {
        logStartupEvent("essential_permissions_granted");
      }

      // Optional permissions (READ_CONTACTS, RECEIVE_SMS) will be requested
      // contextually when user attempts to use those features

      // ⚡ SUCCESS: Save startup state to cache
      await saveCachedStartupState({
        timestamp: Date.now(),
        hasMinimumPermissions: essential.hasMinimum,
        dbReady: true,
      });

      setReady(true);
      const duration = Date.now() - startTime;
      logStartupEvent("ready", { durationMs: duration });
      errorTracking.trackStartupEvent('startup_completed', duration);

    } catch (e: any) {
      console.error("[Startup] Initialization failed", e);

      // Classify error with full context
      const appError = classifyAppError(e, {
        breadcrumbs: [],
        appState: { route: 'startup' },
      });

      // Track error
      errorTracking.trackStartupError(appError, retryContext?.attempt || 1);

      // Check if offline
      const offline = await checkOfflineMode();
      setIsOffline(offline);

      setInitError(appError);
    }
  }, [startTime, retryContext]);

  useEffect(() => {
    logStartupEvent("mount", { at: new Date(startTime).toISOString() });

    // Initialize error tracking and analytics
    Promise.all([
      errorTracking.initialize(),
      initErrorAnalytics()
    ]).then(() => {
      errorTracking.trackStartupEvent('gate_mounted');
      prepareApp();
    }).catch(err => {
      console.warn('[UnifiedStartupGate] Error analytics initialization failed:', err);
      // Don't block startup on analytics failure
      errorTracking.trackStartupEvent('gate_mounted');
      prepareApp();
    });

    return () => {
      logStartupEvent("unmount");
      errorTracking.trackStartupEvent('gate_unmounted');
    };
  }, [prepareApp, startTime]);

  // ⚡ FIX: Start background buffer drain scheduler once DB is ready
  useEffect(() => {
    if (ready) {
      logStartupEvent("starting_buffer_scheduler");
      const stopScheduler = scheduleBufferProcessing(5000); // 5s interval
      return () => {
        logStartupEvent("stopping_buffer_scheduler");
        stopScheduler();
      };
    }
  }, [ready]);

  return {
    ready,
    initError,
    isOffline,
    retryContext,
    startTime,
    prepareApp,
  };
}
