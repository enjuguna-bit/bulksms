package com.bulksms.smsmanager

import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import android.util.Log

/**
 * ✅ HeadlessSmsSendService
 * ------------------------------------------------------------
 * Handles system ACTION_RESPOND_VIA_MESSAGE intents.
 * REQUIRED in AndroidManifest.xml for "Default SMS App" capability.
 * ------------------------------------------------------------
 */
class HeadlessSmsSendService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      stopSelf(startId)
      return START_NOT_STICKY
    }

    try {
      if (TelephonyManager.ACTION_RESPOND_VIA_MESSAGE == intent.action) {
         handleRespondViaMessage(intent)
      }
    } catch (e: Exception) {
      Log.e(TAG, "❌ Error processing RESPOND_VIA_MESSAGE", e)
    }

    stopSelf(startId)
    return START_NOT_STICKY
  }

  private fun handleRespondViaMessage(intent: Intent) {
    val extras = intent.extras
    val uri = intent.data
    val address = uri?.schemeSpecificPart
    val messageBody = extras?.getString(Intent.EXTRA_TEXT)

    if (address.isNullOrBlank() || messageBody.isNullOrBlank()) {
      return
    }

    try {
      // Safely get SmsManager based on version
      val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        this.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }

      smsManager.sendTextMessage(address, null, messageBody, null, null)
      Log.i(TAG, "✅ Quick Reply sent to $address")
    } catch (e: SecurityException) {
      Log.e(TAG, "❌ Missing SEND_SMS permission", e)
    } catch (e: Exception) {
      Log.e(TAG, "❌ Failed to send SMS via Headless Service", e)
    }
  }

  companion object {
    private const val TAG = "HeadlessSmsSendService"
  }
}