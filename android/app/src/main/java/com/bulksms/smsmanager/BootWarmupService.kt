package com.bulksms.smsmanager

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log

/**
 * ✅ BootWarmupService
 * ------------------------------------------------------------
 * Ensures native SMS listeners are active immediately after boot.
 * ------------------------------------------------------------
 */
class BootWarmupService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.i(TAG, "🚀 BootWarmupService: Warming up SMS Listeners")

    try {
      // Start the listener service explicitly
      val listenerIntent = Intent(this, SmsListenerService::class.java)
      startService(listenerIntent)
      Log.i(TAG, "✅ SmsListenerService started")
    } catch (e: Exception) {
      Log.e(TAG, "❌ Warmup failed", e)
    }

    stopSelf(startId)
    return START_NOT_STICKY
  }

  companion object {
    private const val TAG = "BootWarmupService"
  }
}