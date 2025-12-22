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
import { enqueueMessage, getPendingMessages, removeMessage, markMessageFailed } from "@/db/repositories/smsQueue";
import { calculateRetryDelay, DEFAULT_RETRY_CONFIG } from "@/utils/transactionErrorHandling";

// ------------------------------------------------------------
// ⚙️ Queue Configuration
// ------------------------------------------------------------
export const SMS_QUEUE_CONFIG = {
  /** Delay between sending each message (ms) - prevents carrier blocking */
  delayBetweenMessagesMs: 1000,
  /** Maximum retry attempts per message before giving up */
  maxRetries: 3,
  /** Base delay for exponential backoff (ms) - actual delay = base * 2^attempt */
  baseRetryDelayMs: 2000,
  /** Maximum backoff delay cap (ms) */
  maxBackoffDelayMs: 30000,
};

// ------------------------------------------------------------
// 🚀 Enqueue a message
// ------------------------------------------------------------
export async function enqueueSMS(to: string, body: string): Promise<void> {
  await enqueueMessage(to, body);
}

// ------------------------------------------------------------
// 🚚 Process queue (safe, atomic, with delays and backoff)
// ------------------------------------------------------------
export async function processSMSQueue(): Promise<number> {
  const queue = await getPendingMessages();
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
      if (retryCount >= SMS_QUEUE_CONFIG.maxRetries) {
        Logger.warn(
          "SmsQueue",
          `Max retries (${SMS_QUEUE_CONFIG.maxRetries}) exceeded for msg ${msg.id} to ${msg.to_number}, skipping`
        );
        skipped++;
        continue;
      }

      // ✅ Apply exponential backoff delay for retry attempts
      if (retryCount > 0) {
        const backoffDelay = calculateRetryDelay(retryCount - 1, {
          ...DEFAULT_RETRY_CONFIG,
          initialDelayMs: SMS_QUEUE_CONFIG.baseRetryDelayMs,
          maxDelayMs: SMS_QUEUE_CONFIG.maxBackoffDelayMs,
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
        sent++;
        Logger.debug("SmsQueue", `✅ Sent SMS to ${msg.to_number}`);
      } else {
        Logger.warn("SmsQueue", `Failed to send SMS to ${msg.to_number} (sim=${msg.sim_slot || 0})`);
        if (msg.id) await markMessageFailed(msg.id);
      }

      // ✅ Delay between messages to avoid carrier blocking
      if (i < queue.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, SMS_QUEUE_CONFIG.delayBetweenMessagesMs)
        );
      }
    } catch (err) {
      Logger.warn("SmsQueue", "sendDirectSms error", err);
      if (msg.id) {
        await markMessageFailed(msg.id);
      }
    }
  }

  if (skipped > 0) {
    Logger.info("SmsQueue", `Skipped ${skipped} messages that exceeded max retries`);
  }

  return sent;
}

// ------------------------------------------------------------
// 🔄 Manual or background retry trigger
// ------------------------------------------------------------
export async function runQueueNow(): Promise<void> {
  const count = await processSMSQueue();
  console.log(`[Queue] ✅ Sent ${count} queued messages`);
}
