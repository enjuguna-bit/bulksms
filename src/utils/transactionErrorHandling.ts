/**
 * ===================================================================
 * 🚨 src/utils/transactionErrorHandling.ts
 * Enhanced error handling and recovery for payment transactions
 * ===================================================================
 *
 * Provides:
 * - Error categorization and classification
 * - Retry logic with exponential backoff
 * - Recovery strategies
 * - Error logging and diagnostics
 * - User-friendly error messages
 */

// ===================================================================
// Error Types & Classification
// ===================================================================

export enum TransactionErrorType {
  // Parsing errors
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  INVALID_PHONE = "INVALID_PHONE",
  MISSING_DATA = "MISSING_DATA",

  // Data quality errors
  SUSPICIOUS_PATTERN = "SUSPICIOUS_PATTERN",
  DUPLICATE_MESSAGE = "DUPLICATE_MESSAGE",
  DUPLICATE_TRANSACTION = "DUPLICATE_TRANSACTION",
  CONFLICT_DETECTED = "CONFLICT_DETECTED",

  // Database/persistence errors
  DATABASE_ERROR = "DATABASE_ERROR",
  STORAGE_FAILED = "STORAGE_FAILED",
  SYNC_FAILED = "SYNC_FAILED",

  // Authentication errors
  UNTRUSTED_SENDER = "UNTRUSTED_SENDER",
  FAILED_VALIDATION = "FAILED_VALIDATION",

  // System errors
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN = "UNKNOWN",
}

export interface TransactionError {
  type: TransactionErrorType;
  message: string;
  details?: Record<string, any>;
  originalError?: Error;
  timestamp: number;
  retriable: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// ===================================================================
// Error Classification
// ===================================================================

/**
 * Classify error and determine severity/retriability
 */
export function classifyError(
  error: unknown,
  context?: { type?: string; message?: string }
): TransactionError {
  const timestamp = Date.now();

  if (error instanceof Error) {
    const msg = error.message.toUpperCase();

    // Parse errors
    if (msg.includes("PARSE") || msg.includes("INVALID")) {
      return {
        type: TransactionErrorType.INVALID_FORMAT,
        message: error.message,
        originalError: error,
        timestamp,
        retriable: false,
        severity: "MEDIUM",
      };
    }

    // Database errors
    if (msg.includes("DATABASE") || msg.includes("QUERY")) {
      return {
        type: TransactionErrorType.DATABASE_ERROR,
        message: error.message,
        originalError: error,
        timestamp,
        retriable: true,
        severity: "HIGH",
      };
    }

    // Network errors
    if (msg.includes("NETWORK") || msg.includes("FETCH")) {
      return {
        type: TransactionErrorType.NETWORK_ERROR,
        message: error.message,
        originalError: error,
        timestamp,
        retriable: true,
        severity: "MEDIUM",
      };
    }

    // Timeout errors
    if (msg.includes("TIMEOUT")) {
      return {
        type: TransactionErrorType.TIMEOUT,
        message: error.message,
        originalError: error,
        timestamp,
        retriable: true,
        severity: "MEDIUM",
      };
    }
  }

  // Context-based classification
  if (context?.type === "duplicate") {
    return {
      type: TransactionErrorType.DUPLICATE_MESSAGE,
      message: context.message || "Duplicate message detected",
      timestamp,
      retriable: false,
      severity: "LOW",
    };
  }

  if (context?.type === "validation") {
    return {
      type: TransactionErrorType.FAILED_VALIDATION,
      message: context.message || "Validation failed",
      timestamp,
      retriable: false,
      severity: "MEDIUM",
    };
  }

  // Default
  return {
    type: TransactionErrorType.UNKNOWN,
    message: String(error),
    originalError: error instanceof Error ? error : undefined,
    timestamp,
    retriable: false,
    severity: "HIGH",
  };
}

// ===================================================================
// Error Messages (User-Friendly)
// ===================================================================

const ERROR_MESSAGES: Record<TransactionErrorType, string> = {
  [TransactionErrorType.INVALID_FORMAT]:
    "Could not parse payment message. Please check format.",
  [TransactionErrorType.INVALID_AMOUNT]:
    "Amount is invalid or out of acceptable range.",
  [TransactionErrorType.INVALID_PHONE]:
    "Phone number is invalid or not recognized.",
  [TransactionErrorType.MISSING_DATA]:
    "Payment message is incomplete (missing required fields).",
  [TransactionErrorType.SUSPICIOUS_PATTERN]:
    "Message pattern looks suspicious. Check for typos.",
  [TransactionErrorType.DUPLICATE_MESSAGE]:
    "This message was already processed.",
  [TransactionErrorType.DUPLICATE_TRANSACTION]:
    "Similar transaction already recorded.",
  [TransactionErrorType.CONFLICT_DETECTED]:
    "Payment conflicts with existing record.",
  [TransactionErrorType.DATABASE_ERROR]:
    "Database error. Will retry automatically.",
  [TransactionErrorType.STORAGE_FAILED]:
    "Failed to store transaction. Retrying...",
  [TransactionErrorType.SYNC_FAILED]:
    "Server sync failed. Will retry when online.",
  [TransactionErrorType.UNTRUSTED_SENDER]:
    "Message from unknown sender. Not recorded.",
  [TransactionErrorType.FAILED_VALIDATION]:
    "Validation failed. Transaction not recorded.",
  [TransactionErrorType.TIMEOUT]:
    "Operation timed out. Will retry.",
  [TransactionErrorType.NETWORK_ERROR]:
    "Network error. Will retry when connected.",
  [TransactionErrorType.UNKNOWN]:
    "Unexpected error occurred. Please try again.",
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(errorType: TransactionErrorType): string {
  return ERROR_MESSAGES[errorType] || "An error occurred";
}

// ===================================================================
// Retry Logic
// ===================================================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Calculate delay for retry attempt (exponential backoff)
 */
export function calculateRetryDelay(
  attempt: number, // 0-indexed
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );

  // Add jitter (±10%)
  const jitter = delay * (0.9 + Math.random() * 0.2);

  return Math.round(jitter);
}

/**
 * Retry async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxAttempts - 1) {
        const delay = calculateRetryDelay(attempt, config);
        onRetry?.(attempt, lastError);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Retry exhausted");
}

// ===================================================================
// Error Recovery Strategies
// ===================================================================

export interface RecoveryStrategy {
  canRecover: boolean;
  action: "RETRY" | "SKIP" | "MANUAL_REVIEW" | "NOTIFY_USER";
  recommendation: string;
}

/**
 * Determine recovery strategy based on error
 */
export function getRecoveryStrategy(error: TransactionError): RecoveryStrategy {
  switch (error.type) {
    // Retriable errors
    case TransactionErrorType.DATABASE_ERROR:
    case TransactionErrorType.STORAGE_FAILED:
    case TransactionErrorType.SYNC_FAILED:
    case TransactionErrorType.TIMEOUT:
    case TransactionErrorType.NETWORK_ERROR:
      return {
        canRecover: true,
        action: "RETRY",
        recommendation: "Automatic retry with backoff",
      };

    // Skip these (don't count as failures)
    case TransactionErrorType.DUPLICATE_MESSAGE:
    case TransactionErrorType.DUPLICATE_TRANSACTION:
      return {
        canRecover: true,
        action: "SKIP",
        recommendation: "Message already processed, skipping",
      };

    // Manual review needed
    case TransactionErrorType.SUSPICIOUS_PATTERN:
    case TransactionErrorType.UNTRUSTED_SENDER:
    case TransactionErrorType.CONFLICT_DETECTED:
      return {
        canRecover: true,
        action: "MANUAL_REVIEW",
        recommendation: "Review manually before processing",
      };

    // Non-recoverable, notify user
    case TransactionErrorType.INVALID_FORMAT:
    case TransactionErrorType.INVALID_AMOUNT:
    case TransactionErrorType.INVALID_PHONE:
    case TransactionErrorType.MISSING_DATA:
    case TransactionErrorType.FAILED_VALIDATION:
      return {
        canRecover: false,
        action: "NOTIFY_USER",
        recommendation: "User intervention required",
      };

    // Unknown
    default:
      return {
        canRecover: false,
        action: "NOTIFY_USER",
        recommendation: "Unknown error, needs investigation",
      };
  }
}

// ===================================================================
// Error Logging & Analytics
// ===================================================================

export interface ErrorLog {
  errors: TransactionError[];
  addError(error: TransactionError): void;
  getErrorsByType(type: TransactionErrorType): TransactionError[];
  getErrorsByTimeRange(start: number, end: number): TransactionError[];
  getSummary(): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  clear(): void;
}

/**
 * In-memory error log
 */
export class TransactionErrorLog implements ErrorLog {
  errors: TransactionError[] = [];
  private maxSize: number = 1000;

  addError(error: TransactionError): void {
    this.errors.push(error);

    // Keep memory bounded
    if (this.errors.length > this.maxSize) {
      this.errors = this.errors.slice(-this.maxSize);
    }
  }

  getErrorsByType(type: TransactionErrorType): TransactionError[] {
    return this.errors.filter((e) => e.type === type);
  }

  getErrorsByTimeRange(start: number, end: number): TransactionError[] {
    return this.errors.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }

  getSummary(): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  } {
    const summary = {
      total: this.errors.length,
      bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      byType: {} as Record<string, number>,
    };

    for (const error of this.errors) {
      summary.bySeverity[error.severity]++;

      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
    }

    return summary;
  }

  clear(): void {
    this.errors = [];
  }
}

// ===================================================================
// Export
// ===================================================================

export const TransactionErrorHandling = {
  // Types & enums
  TransactionErrorType,

  // Functions
  classifyError,
  getUserFriendlyMessage,
  calculateRetryDelay,
  retryAsync,
  getRecoveryStrategy,

  // Classes
  TransactionErrorLog,

  // Config
  DEFAULT_RETRY_CONFIG,
} as const;
