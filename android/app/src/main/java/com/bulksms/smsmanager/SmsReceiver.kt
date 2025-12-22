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
 * ✅ Safaricom Keyword Handling:
 *    - BAL: Balance inquiry request
 *    - STOP: Opt-out request
 *    - INFO: Information request
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

            // ✅ Handle Safaricom-specific keywords
            handleSafaricomKeywords(body, address)
          }
        } catch (e: Exception) {
          Log.e(TAG, "❌ Failed to parse incoming SMS", e)
        }
      }
    }
  }

  /**
   * 🇰🇪 Safaricom Keyword Handler
   * Processes common SMS keywords for bulk messaging systems
   */
  private fun handleSafaricomKeywords(body: String, sender: String) {
    val upperBody = body.trim().uppercase()

    when {
      upperBody == "BAL" || upperBody.startsWith("BAL ") -> {
        // User requested balance check
        logBalanceRequest(sender)
      }
      upperBody == "STOP" || upperBody.startsWith("STOP ") -> {
        // Opt-out request - user wants to unsubscribe
        handleOptOut(sender)
      }
      upperBody == "INFO" || upperBody.startsWith("INFO ") -> {
        // Information request
        sendInfoResponse(sender)
      }
      upperBody == "HELP" || upperBody.startsWith("HELP ") -> {
        // Help request
        logHelpRequest(sender)
      }
    }
  }

  /**
   * Log balance inquiry request and forward to JS layer
   */
  private fun logBalanceRequest(sender: String) {
    Log.i(TAG, "💰 Balance request from: $sender")
    
    // Forward keyword event to JS for handling
    SmsListenerModule.sendKeywordEventToJs(
      sender = sender,
      keyword = "BAL",
      action = "balance_request"
    )
  }

  /**
   * Handle opt-out/unsubscribe request
   * This is critical for compliance with Kenyan CA regulations
   */
  private fun handleOptOut(sender: String) {
    Log.i(TAG, "🛑 Opt-out request from: $sender")
    
    // Forward keyword event to JS for opt-out processing
    SmsListenerModule.sendKeywordEventToJs(
      sender = sender,
      keyword = "STOP",
      action = "opt_out"
    )
  }

  /**
   * Handle info request - user wants service information
   */
  private fun sendInfoResponse(sender: String) {
    Log.i(TAG, "ℹ️ Info request from: $sender")
    
    // Forward keyword event to JS for info response
    SmsListenerModule.sendKeywordEventToJs(
      sender = sender,
      keyword = "INFO",
      action = "info_request"
    )
  }

  /**
   * Log help request and forward to JS layer
   */
  private fun logHelpRequest(sender: String) {
    Log.i(TAG, "❓ Help request from: $sender")
    
    // Forward keyword event to JS for help response
    SmsListenerModule.sendKeywordEventToJs(
      sender = sender,
      keyword = "HELP",
      action = "help_request"
    )
  }

  companion object {
    private const val TAG = "SmsReceiver"
  }
}
