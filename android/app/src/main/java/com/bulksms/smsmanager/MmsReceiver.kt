package com.bulksms.smsmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log

/**
 * ✅ MmsReceiver
 * ------------------------------------------------------------
 * Receives WAP_PUSH_RECEIVED intents for MMS notifications.
 * Triggered by the system when an MMS is received.
 * ------------------------------------------------------------
 * Note: Full MMS parsing requires READ MMS permissions and
 * content resolver access, but this receiver ensures your app
 * stays compliant as the default SMS handler.
 * ------------------------------------------------------------
 */
class MmsReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    // Handle WAP_PUSH_DELIVER (default app) - required for default SMS app role
    if (intent.action == "android.provider.Telephony.WAP_PUSH_DELIVER" ||
        intent.action == "android.provider.Telephony.WAP_PUSH_RECEIVED") {
      Log.d(TAG, "📩 MMS received (action: ${intent.action})")
      val extras: Bundle? = intent.extras
      // TODO: parse MMS content if required, forward to JS layer
    }
  }

  companion object {
    private const val TAG = "MmsReceiver"
  }
}
