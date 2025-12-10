package com.bulksms.smsmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import android.util.Log

/**
 * ✅ SmsReceiver
 * ------------------------------------------------------------
 * Receives incoming SMS and logs or forwards them to the JS layer
 * (via SmsListenerModule or event emitter bridge).
 * ------------------------------------------------------------
 * Works when the app is the default SMS handler.
 * ------------------------------------------------------------
 */
class SmsReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    // Handle both SMS_DELIVER (default app) and SMS_RECEIVED (fallback)
    if (Telephony.Sms.Intents.SMS_DELIVER_ACTION == intent.action ||
        Telephony.Sms.Intents.SMS_RECEIVED_ACTION == intent.action) {
      val bundle: Bundle? = intent.extras
      if (bundle != null) {
        try {
          val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
          if (msgs.isEmpty()) return

          // Concatenate parts if it's a multi-part message (rare but possible)
          // Usually we just handle each message individually, but let's be robust.
          // For simplicity in this specific "event" context, we'll emit one event per message object
          // because keying them by address/timestamp to reconstruct effectively is complex in a stateless receiver.
          
          for (msg in msgs) {
            val address = msg.displayOriginatingAddress ?: "Unknown"
            val body = msg.displayMessageBody ?: ""
            val timestamp = msg.timestampMillis

            Log.d(TAG, "📩 SMS from $address: $body")

            // Forward to JS bridge
            SmsListenerModule.sendEventToJs(address, body, timestamp)
          }
        } catch (e: Exception) {
          Log.e(TAG, "❌ Failed to parse incoming SMS", e)
        }
      }
    }
  }

  companion object {
    private const val TAG = "SmsReceiver"
  }
}
