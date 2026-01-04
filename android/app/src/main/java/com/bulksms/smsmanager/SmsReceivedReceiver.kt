package com.bulksms.smsmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import android.util.Log

/**
 * SmsReceivedReceiver
 * ------------------------------------------------------------
 * Receives SMS_RECEIVED broadcasts when the app is NOT the default SMS app.
 * This receiver does NOT have BROADCAST_SMS permission requirement,
 * which allows it to receive system SMS broadcasts.
 * ------------------------------------------------------------
 */
class SmsReceivedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION == intent.action) {
            Log.d(TAG, "📨 SMS_RECEIVED broadcast received")
            
            val bundle: Bundle? = intent.extras
            if (bundle != null) {
                try {
                    val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                    if (msgs.isEmpty()) {
                        Log.w(TAG, "⚠️ No messages in intent")
                        return
                    }

                    for (msg in msgs) {
                        val address = msg.displayOriginatingAddress ?: "Unknown"
                        val body = msg.displayMessageBody ?: ""
                        val timestamp = msg.timestampMillis

                        Log.d(TAG, "📩 SMS from $address: ${body.take(50)}...")

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
        private const val TAG = "SmsReceivedReceiver"
    }
}
