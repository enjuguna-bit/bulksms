// ------------------------------------------------------------
// 📦 SmsQueue — Safe native SMS background queue
// ------------------------------------------------------------
// Guarantees:
//   • Corruption-proof queue storage
//   • Works even if AsyncStorage has bad JSON
//   • Safe if SmsSenderModule missing or not default SMS app
//   • Uses sendDirectSms only if available
//   • Atomic writes: queue never gets lost
//   • Versioned storage key
//   • ✅ Configurable delay between messages (carrier safety)
//   • ✅ Exponential backoff for retries
//   • ✅ Max retry limit enforcement
// ------------------------------------------------------------

import { Platform } from "react-native";
import { smsSender } from "@/native";
import Logger from "@/utils/logger";
import { enqueueMessage, getPendingMessages, removeMessage, markMessageFailed, getQueueStats } from "@/db/repositories/smsQueue";
import { calculateRetryDelay, DEFAULT_RETRY_CONFIG } from "@/utils/transactionErrorHandling";
import { updateMessageStatus } from "@/db/messaging";
import { canSendSms } from "@/services/smsService";

// ------------------------------------------------------------
// ⚙️ Queue Configuration
// ------------------------------------------------------------
import { getSmsConfig } from "@/config/smsConfig";
// Removed local SMS_QUEUE_CONFIG in favor of getSmsConfig()

// ------------------------------------------------------------
// ⚡ Circuit Breaker State
// ------------------------------------------------------------
let consecutiveFailures = 0;
let circuitBreakerTriggeredAt: number | null = null;

/**
 * Check if circuit breaker is currently active (in cooldown)
 */
export function isCircuitBreakerActive(): boolean {
  if (!circuitBreakerTriggeredAt) return false;

  const config = getSmsConfig();
  const elapsed = Date.now() - circuitBreakerTriggeredAt;
  if (elapsed >= config.circuitBreakerCooldownMs) {
    // Cooldown expired, reset circuit breaker
    circuitBreakerTriggeredAt = null;
    consecutiveFailures = 0;
    Logger.info('SmsQueue', 'Circuit breaker cooldown expired, queue resumed');
    return false;
  }

  return true;
}

/**
 * Manually reset the circuit breaker (e.g., after user fixes network)
 */
export function resetCircuitBreaker(): void {
  consecutiveFailures = 0;
  circuitBreakerTriggeredAt = null;
  Logger.info('SmsQueue', 'Circuit breaker manually reset');
}

/**
 * Get circuit breaker status for UI display
 */
export function getCircuitBreakerStatus(): {
  isActive: boolean;
  consecutiveFailures: number;
  cooldownRemainingMs: number | null;
} {
  const isActive = isCircuitBreakerActive();
  return {
    isActive,
    consecutiveFailures,
    cooldownRemainingMs: circuitBreakerTriggeredAt
      ? Math.max(0, getSmsConfig().circuitBreakerCooldownMs - (Date.now() - circuitBreakerTriggeredAt))
      : null,
  };
}

// ------------------------------------------------------------
// 🚀 Enqueue a message
// ------------------------------------------------------------
export async function enqueueSMS(to: string, body: string, simSlot: number = 0, dbMessageId?: number): Promise<void> {
  await enqueueMessage(to, body, simSlot, dbMessageId);
}

// ------------------------------------------------------------
// 🚚 Process queue (safe, atomic, with delays and backoff)
// ------------------------------------------------------------
export async function processSMSQueue(): Promise<number> {
  const config = getSmsConfig();

  // ⚡ Check circuit breaker before processing
  if (isCircuitBreakerActive()) {
    const status = getCircuitBreakerStatus();
    Logger.warn(
      'SmsQueue',
      `Circuit breaker active, skipping queue. Cooldown: ${Math.round((status.cooldownRemainingMs || 0) / 1000)}s`
    );
    return 0;
  }

  const queue = await getPendingMessages(config.maxRetries);
  if (queue.length === 0) return 0;

  if (Platform.OS !== "android") {
    Logger.warn("SmsQueue", "Cannot process queue — Android only.");
    return 0;
  }

  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < queue.length; i++) {
    const msg = queue[i];
    const retryCount = msg.retryCount || 0;

    try {
      // ✅ Check max retry limit
      if (retryCount >= config.maxRetries) {
        Logger.warn(
          "SmsQueue",
          `Max retries (${config.maxRetries}) exceeded for msg ${msg.id} to ${msg.to_number}, skipping`
        );
        skipped++;
        continue;
      }

      // ✅ Apply exponential backoff delay for retry attempts
      if (retryCount > 0) {
        const backoffDelay = calculateRetryDelay(retryCount - 1, {
          ...DEFAULT_RETRY_CONFIG,
          initialDelayMs: config.baseRetryDelayMs,
          maxDelayMs: config.maxBackoffDelayMs,
        });
        Logger.debug(
          "SmsQueue",
          `Retry attempt ${retryCount} for msg ${msg.id}, waiting ${backoffDelay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }

      // Send the SMS
      const success = await smsSender.send(msg.to_number, msg.body, msg.sim_slot || 0);

      if (success) {
        if (msg.id) await removeMessage(msg.id);

        // ✅ Sync status with messaging DB
        if (msg.db_message_id) {
          await updateMessageStatus(msg.db_message_id, 'sent').catch(e =>
            Logger.warn("SmsQueue", `Failed to sync sent status for msg ${msg.db_message_id}`, e)
          );
        }

        sent++;
        consecutiveFailures = 0; // ⚡ Reset on success
        Logger.debug("SmsQueue", `✅ Sent SMS to ${msg.to_number}`);
      } else {
        consecutiveFailures++; // ⚡ Track consecutive failures
        Logger.warn("SmsQueue", `Failed to send SMS to ${msg.to_number} (sim=${msg.sim_slot || 0}) [failures: ${consecutiveFailures}]`);
        if (msg.id) await markMessageFailed(msg.id, config.maxRetries);

        // ✅ Sync failure status if retries exhausted
        if ((retryCount + 1) >= config.maxRetries && msg.db_message_id) {
          await updateMessageStatus(msg.db_message_id, 'failed').catch(() => { });
        }

        // ⚡ Circuit breaker check
        if (consecutiveFailures >= config.maxConsecutiveFailures) {
          circuitBreakerTriggeredAt = Date.now();
          Logger.error(
            'SmsQueue',
            `⚠️ Circuit breaker triggered after ${consecutiveFailures} consecutive failures - stopping queue for ${config.circuitBreakerCooldownMs / 1000}s`
          );
          return sent; // Stop processing immediately
        }
      }

      // Apply priority-specific delay between messages
      if (i < queue.length - 1) {
        const priority = msg.priority || 0;
        let delay = config.delayBetweenMessagesMs;
        
        if (priority === 1) delay = config.priorityDelays.high;
        else if (priority === 2) delay = config.priorityDelays.urgent;
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      consecutiveFailures++; // ⚡ Track consecutive failures
      Logger.warn("SmsQueue", `sendDirectSms error [failures: ${consecutiveFailures}]`, err);
      if (msg.id) {
        await markMessageFailed(msg.id, config.maxRetries);
      }

      // ⚡ Circuit breaker check
      if (consecutiveFailures >= config.maxConsecutiveFailures) {
        circuitBreakerTriggeredAt = Date.now();
        Logger.error(
          'SmsQueue',
          `⚠️ Circuit breaker triggered after ${consecutiveFailures} consecutive failures - stopping queue`
        );
        return sent; // Stop processing immediately
      }
    }
  }

  if (skipped > 0) {
    Logger.info("SmsQueue", `Skipped ${skipped} messages that exceeded max retries`);
  }

  const stats = await getQueueStats();
  Logger.info("SmsQueue", `Queue processing complete. Sent: ${sent}, Failed: ${skipped + consecutiveFailures}, Remaining: ${stats.pending}`);

  return sent;
}

// ------------------------------------------------------------
// 🔄 Manual or background retry trigger
// ------------------------------------------------------------
export async function runQueueNow(): Promise<number> {
  // ⚡ FIX: Check if system improved and auto-reset breaker
  try {
    const healthy = await canSendSms();
    if (healthy && isCircuitBreakerActive()) {
      Logger.info("SmsQueue", "System healthy (canSendSms=true) - Auto-resetting circuit breaker before retry");
      resetCircuitBreaker();
    }
  } catch (e) {
    Logger.warn("SmsQueue", "Failed to check health before retry", e);
  }

  const count = await processSMSQueue();
  console.log(`[Queue] ✅ Sent ${count} queued messages`);
  return count;
}
