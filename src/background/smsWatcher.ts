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
// ------------------------------------------------------------

import { Platform } from "react-native";
import { smsSender } from "@/native";
import Logger from "@/utils/logger";
import { enqueueMessage, getPendingMessages, removeMessage, markMessageFailed } from "@/db/repositories/smsQueue";
import { addMessage, getMessagesByAddress } from "@/db/repositories/messages";

// ------------------------------------------------------------
// 🚀 Enqueue a message
// ------------------------------------------------------------
export async function enqueueSMS(to: string, body: string): Promise<void> {
  await enqueueMessage(to, body);
}

// ------------------------------------------------------------
// 🚚 Process queue (safe, atomic)
// ------------------------------------------------------------
export async function processSMSQueue(): Promise<number> {
  const queue = await getPendingMessages();
  if (queue.length === 0) return 0;

  if (Platform.OS !== "android") {
    Logger.warn("SmsQueue", "Cannot process queue — Android only.");
    return 0;
  }

  let sent = 0;

  for (const msg of queue) {
    try {
      // Logic Fix: smsSender.send now correctly returns a boolean based on the native success flag
      const success = await smsSender.send(msg.to_number, msg.body, msg.sim_slot || 0);

      if (success) {
        if (msg.id) await removeMessage(msg.id);
        sent++;
      } else {
        Logger.warn("SmsQueue", `Failed to send SMS to ${msg.to_number} (sim=${msg.sim_slot || 0})`);
        if (msg.id) await markMessageFailed(msg.id);
      }

      // Optional: brief micro-yield to avoid blocking UI thread
      await Promise.resolve();
    } catch (err) {
      Logger.warn("SmsQueue", "sendDirectSms error", err);
      if (msg.id) {
        await markMessageFailed(msg.id);
      }
    }
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
