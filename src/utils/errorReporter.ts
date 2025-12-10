// ------------------------------------------------------
// ⚠️ src/utils/errorReporter.ts
// Centralized error + warning reporter with optional Toast UI
// React Native CLI compatible
// ------------------------------------------------------

import Toast from 'react-native-toast-message';

export type ReportLevel = 'error' | 'warning';

export interface ReportOptions {
  /** When true (default), show a toast notification in addition to logging. */
  showToast?: boolean;
  /** Override toast type (defaults to the same as level). */
  toastType?: 'success' | 'info' | 'error';
}

/**
 * Normalizes any thrown value into a readable string.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch (_) {
    return 'Unknown error';
  }
}

/**
 * Displays a toast message safely without blocking UI.
 */
function safeToast(
  level: ReportLevel,
  title: string,
  message: string,
  options?: ReportOptions
): void {
  if (options?.showToast === false) return;

  const toastType = options?.toastType ?? (level === 'error' ? 'error' : 'info');
  try {
    Toast.show({
      type: toastType,
      text1: title,
      text2: message,
      position: 'bottom',
    });
  } catch (toastError) {
    console.warn('[errorReporter] Failed to render toast:', toastError);
  }
}

/**
 * Logs an issue and optionally shows a toast.
 */
import Logger from './logger';

export function reportIssue(
  level: ReportLevel,
  scope: string,
  error: unknown,
  options?: ReportOptions
): void {
  const message = formatError(error);

  if (level === 'error') {
    Logger.error(scope, message, error);
  } else {
    Logger.warn(scope, message, error);
  }

  safeToast(level, scope, message, options);
}

/**
 * Convenience wrappers.
 */
export function reportError(
  scope: string,
  error: unknown,
  options?: ReportOptions
): void {
  reportIssue('error', scope, error, options);
}

export function reportWarning(
  scope: string,
  error: unknown,
  options?: ReportOptions
): void {
  reportIssue('warning', scope, error, options);
}
