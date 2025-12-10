package com.bulksms.smsmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * ✅ BootReceiver
 * ------------------------------------------------------------
 * Handles BOOT_COMPLETED and reinitializes background components
 * such as SMS listeners and warmup services.
 * ------------------------------------------------------------
 * Triggered automatically on device reboot when declared in the
 * manifest with RECEIVE_BOOT_COMPLETED permission.
 * ------------------------------------------------------------
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      Log.d(TAG, "BOOT_COMPLETED received")

      // Reinitialize background tasks
      val workRequest = OneTimeWorkRequestBuilder<BootReinitWorker>().build()
      WorkManager.getInstance(context).enqueue(workRequest)

      // Optionally warm up SMS services
      val warmIntent = Intent(context, BootWarmupService::class.java)
      context.startService(warmIntent)
    }
  }

  companion object {
    private const val TAG = "BootReceiver"
  }
}
