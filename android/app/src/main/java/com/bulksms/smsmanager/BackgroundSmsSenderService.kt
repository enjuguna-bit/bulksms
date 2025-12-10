package com.bulksms.smsmanager

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * ✅ BackgroundSmsSenderService (Android 14 Compliant)
 * ------------------------------------------------------------
 * Handles bulk SMS queue processing in the foreground.
 * MUST use 'dataSync' type to prevent system killing.
 * ------------------------------------------------------------
 */
class BackgroundSmsSenderService : Service() {

  // Handler for timeout management (Android 14 safety)
  private val handler = android.os.Handler(android.os.Looper.getMainLooper())
  private val timeOutRunnable = Runnable {
    Log.w(TAG, "⚠️ Service timed out (Android 14 safety). Stopping self.")
    stopSelf()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForegroundServiceCompat()

    // ⚡ FIX: Reset timeout timer on every start command
    handler.removeCallbacks(timeOutRunnable)
    // 120 seconds safety timeout (System limit is ~3 mins for dataSync)
    handler.postDelayed(timeOutRunnable, 120_000L) 
    Log.d(TAG, "⏳ Safety timeout set for 120s")

    if (intent == null) return START_NOT_STICKY

    // Logic: Extract queue data and send
    // Note: Actual logic interacts with React Context or a native Queue Manager.
    // Ideally, pass arrays of numbers/messages via Intent extras here.
    
    return START_NOT_STICKY
  }
  
  override fun onDestroy() {
    super.onDestroy()
    handler.removeCallbacks(timeOutRunnable)
    Log.d(TAG, "🛑 Service destroyed")
  }

  private fun startForegroundServiceCompat() {
    val channelId = "bulk_sms_background_channel"
    val channelName = "Bulk SMS Service"

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val chan = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(chan)
    }

    val notification: Notification = NotificationCompat.Builder(this, channelId)
      .setContentTitle("Sending Bulk SMS")
      .setContentText("Processing queue...")
      .setSmallIcon(R.mipmap.ic_launcher) // Ensure this resource exists
      .setOngoing(true)
      .build()

    // Android 14+ requires the type to be specified explicitly
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(1, notification)
    }
  }

  companion object {
    const val TAG = "BackgroundSmsService"
  }
}