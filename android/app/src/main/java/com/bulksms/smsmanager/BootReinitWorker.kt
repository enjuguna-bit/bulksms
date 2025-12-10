package com.bulksms.smsmanager

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.bulksms.SmsQueueService

/**
 * ✅ BootReinitWorker
 * ------------------------------------------------------------
 * Kicks off the Headless JS Task (SmsQueueService) after reboot.
 * Ensures the app resumes sending pending messages automatically.
 * ------------------------------------------------------------
 */
class BootReinitWorker(appContext: Context, workerParams: WorkerParameters) :
  Worker(appContext, workerParams) {

  override fun doWork(): androidx.work.ListenableWorker.Result {
    Log.d(TAG, "🔄 Boot detected: Starting SMS Queue Processor")
    
    return try {
      val intent = Intent(applicationContext, SmsQueueService::class.java)
      
      // On Android 8+, we must start foreground service properly
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        applicationContext.startForegroundService(intent)
      } else {
        applicationContext.startService(intent)
      }
      
      androidx.work.ListenableWorker.Result.success()
    } catch (e: Exception) {
      Log.e(TAG, "❌ Failed to start SmsQueueService", e)
      androidx.work.ListenableWorker.Result.retry()
    }
  }

  companion object {
    private const val TAG = "BootReinitWorker"
  }
}