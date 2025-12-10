package com.bulksms.smsmanager

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * ✅ SmsListenerService
 * ------------------------------------------------------------
 * Keeps SMS listening alive if needed.
 * - Can run as a foreground service with a persistent notification.
 * - Useful for restoring SMS receivers after boot or Doze.
 * - Safe on Android 13+ (uses proper NotificationChannel).
 * ------------------------------------------------------------
 */
class SmsListenerService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    Log.i(TAG, "🟢 SmsListenerService created")

    // Optional: promote to foreground for reliability
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundServiceWithNotification()
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.i(TAG, "▶️ SmsListenerService started (flags=$flags, startId=$startId)")
    // TODO: Re-initialize listeners, WorkManager, or background tasks here
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.w(TAG, "🔴 SmsListenerService destroyed")
  }

  // ------------------------------------------------------------
  // 🔔 Foreground service setup
  // ------------------------------------------------------------
  private fun startForegroundServiceWithNotification() {
    val channelId = "sms_listener_channel"
    val channelName = "SMS Listener"
    val notificationId = 1001

    val notificationManager =
      getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId,
        channelName,
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps the SMS listener service active"
        setShowBadge(false)
      }
      notificationManager.createNotificationChannel(channel)
    }

    val notification: Notification = Notification.Builder(this, channelId)
      .setContentTitle("SMS Listener Active")
      .setContentText("Listening for incoming messages")
      .setSmallIcon(android.R.drawable.stat_notify_chat)
      .setOngoing(true)
      .build()

    startForeground(notificationId, notification)
  }

  companion object {
    private const val TAG = "SmsListenerService"
  }
}
