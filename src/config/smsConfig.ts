// ------------------------------------------------------------
// ⚙️ src/config/smsConfig.ts
// Dynamic configuration for SMS Queue and Sender
// ------------------------------------------------------------

export interface SmsQueueConfig {
    /** Delay between sending each message (ms) - prevents carrier blocking */
    delayBetweenMessagesMs: number;
    /** Maximum retry attempts per message before giving up */
    maxRetries: number;
    /** Base delay for exponential backoff (ms) - actual delay = base * 2^attempt */
    baseRetryDelayMs: number;
    /** Maximum backoff delay cap (ms) */
    maxBackoffDelayMs: number;
    /** ⚡ Circuit breaker: max consecutive failures before stopping queue */
    maxConsecutiveFailures: number;
    /** ⚡ Circuit breaker: cooldown period after trigger (ms) */
    circuitBreakerCooldownMs: number;
    /** Priority-specific delays (ms) */
    priorityDelays: {
        normal: number;
        high: number;
        urgent: number;
    };
}

/**
 * Default configuration values (Safe defaults)
 */
export const DEFAULT_SMS_CONFIG: SmsQueueConfig = {
    delayBetweenMessagesMs: 1000,
    maxRetries: 3,
    baseRetryDelayMs: 2000,
    maxBackoffDelayMs: 30000,
    maxConsecutiveFailures: 5,
    circuitBreakerCooldownMs: 60000, // 1 minute
    priorityDelays: {
        normal: 1000, // 1 second
        high: 500,   // 0.5 seconds
        urgent: 100  // 0.1 seconds
    }
};

// Internal mutable config state
let currentConfig: SmsQueueConfig = { ...DEFAULT_SMS_CONFIG };

/**
 * Get the current SMS configuration
 */
export function getSmsConfig(): SmsQueueConfig {
    return { ...currentConfig };
}

/**
 * Update the SMS configuration at runtime
 * @param updates Partial configuration to apply
 */
export function updateSmsConfig(updates: Partial<SmsQueueConfig>): SmsQueueConfig {
    currentConfig = {
        ...currentConfig,
        ...updates,
    };
    return currentConfig;
}

/**
 * Reset configuration to defaults
 */
export function resetSmsConfig(): void {
    currentConfig = { ...DEFAULT_SMS_CONFIG };
}
