package com.bulksms.smsmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import androidx.work.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * ✅ BulkSmsSchedulerModule — React Native Bridge for Bulk SMS
 * ------------------------------------------------------------
 * Provides a clean API for scheduling, monitoring, and cancelling
 * bulk SMS jobs from the JavaScript layer.
 *
 * Features:
 * • Schedule bulk SMS via WorkManager
 * • Real-time progress events to JS
 * • Cancel running jobs
 * • Query job status
 * • Configurable delays and retry settings
 * ------------------------------------------------------------
 */
class BulkSmsSchedulerModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    companion object {
        private const val TAG = "BulkSmsScheduler"
        
        // Event names for React Native
        private const val EVENT_PROGRESS = "BulkSmsProgress"
        private const val EVENT_COMPLETE = "BulkSmsComplete"
        private const val EVENT_ERROR = "BulkSmsError"
    }

    private var workId: UUID? = null
    private var progressReceiver: BroadcastReceiver? = null
    private var completeReceiver: BroadcastReceiver? = null
    private var isReceiverRegistered = false

    override fun getName(): String = "BulkSmsSchedulerModule"

    // Required for NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) {}
    
    @ReactMethod
    fun removeListeners(count: Int) {}

    // ============================================================
    // 📤 Schedule Bulk SMS Job
    // ============================================================
    /**
     * Schedule a bulk SMS sending job.
     * 
     * @param recipients Array of phone numbers
     * @param message The message text
     * @param options Configuration options:
     *   - simSlot: SIM slot to use (0 or 1)
     *   - delayMs: Delay between messages in milliseconds (500-5000)
     *   - maxRetries: Maximum retry attempts per message (1-5)
     */
    @ReactMethod
    fun scheduleBulkSend(
        recipients: ReadableArray,
        message: String,
        options: ReadableMap?,
        promise: Promise
    ) {
        try {
            // Validate input
            if (recipients.size() == 0) {
                promise.reject("INVALID_ARGS", "Recipients array cannot be empty")
                return
            }
            
            if (message.isBlank()) {
                promise.reject("INVALID_ARGS", "Message cannot be empty")
                return
            }
            
            // Convert recipients to string array
            val recipientArray = Array(recipients.size()) { i ->
                recipients.getString(i) ?: ""
            }.filter { it.isNotBlank() }.toTypedArray()
            
            if (recipientArray.isEmpty()) {
                promise.reject("INVALID_ARGS", "No valid phone numbers provided")
                return
            }
            
            // Parse options
            val simSlot = options?.getInt("simSlot") ?: 0
            val delayMs = options?.getDouble("delayMs")?.toLong() ?: 1500L
            val maxRetries = options?.getInt("maxRetries") ?: 3
            
            // Register receivers for progress updates
            registerProgressReceivers()
            
            // Build work request
            val workRequest = BulkSmsSendingWorker.buildWorkRequest(
                recipients = recipientArray,
                message = message,
                simSlot = simSlot,
                delayMs = delayMs,
                maxRetries = maxRetries
            )
            
            // Enqueue work
            val workManager = WorkManager.getInstance(ctx)
            workManager.enqueueUniqueWork(
                "bulk_sms_job",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )
            
            workId = workRequest.id
            
            Log.i(TAG, "✅ Scheduled bulk SMS job: ${recipientArray.size} recipients, workId=$workId")
            
            // Return job info
            val result = Arguments.createMap().apply {
                putString("workId", workId.toString())
                putInt("recipientCount", recipientArray.size)
                putString("status", "scheduled")
            }
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule bulk SMS job", e)
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    // ============================================================
    // ❌ Cancel Running Job
    // ============================================================
    @ReactMethod
    fun cancelBulkSend(promise: Promise) {
        try {
            val workManager = WorkManager.getInstance(ctx)
            
            workId?.let { id ->
                workManager.cancelWorkById(id)
                Log.i(TAG, "🛑 Cancelled bulk SMS job: $id")
                
                val result = Arguments.createMap().apply {
                    putString("workId", id.toString())
                    putString("status", "cancelled")
                }
                promise.resolve(result)
            } ?: run {
                // Cancel by tag if no specific ID
                workManager.cancelAllWorkByTag(TAG)
                
                val result = Arguments.createMap().apply {
                    putString("status", "cancelled")
                    putString("message", "Cancelled all bulk SMS jobs")
                }
                promise.resolve(result)
            }
            
            unregisterProgressReceivers()
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to cancel bulk SMS job", e)
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    // ============================================================
    // 📊 Get Job Status
    // ============================================================
    @ReactMethod
    fun getBulkSendStatus(promise: Promise) {
        try {
            val workManager = WorkManager.getInstance(ctx)
            
            workId?.let { id ->
                val workInfo = workManager.getWorkInfoById(id).get()
                
                val result = Arguments.createMap().apply {
                    putString("workId", id.toString())
                    putString("state", workInfo?.state?.name ?: "UNKNOWN")
                    
                    // Add output data if available
                    workInfo?.outputData?.let { data ->
                        putInt("totalSent", data.getInt(BulkSmsSendingWorker.KEY_TOTAL_SENT, 0))
                        putInt("totalFailed", data.getInt(BulkSmsSendingWorker.KEY_TOTAL_FAILED, 0))
                        putInt("totalDelivered", data.getInt(BulkSmsSendingWorker.KEY_TOTAL_DELIVERED, 0))
                    }
                }
                promise.resolve(result)
            } ?: run {
                val result = Arguments.createMap().apply {
                    putString("state", "NONE")
                    putString("message", "No bulk SMS job found")
                }
                promise.resolve(result)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to get bulk SMS status", e)
            promise.reject("STATUS_ERROR", e.message, e)
        }
    }

    // ============================================================
    // 🔄 Live Progress Observation
    // ============================================================
    @ReactMethod
    fun observeProgress(promise: Promise) {
        try {
            workId?.let { id ->
                val workManager = WorkManager.getInstance(ctx)
                
                // Use ListenableFuture for observing
                workManager.getWorkInfoByIdLiveData(id)
                
                promise.resolve(Arguments.createMap().apply {
                    putString("status", "observing")
                    putString("workId", id.toString())
                })
            } ?: run {
                promise.resolve(Arguments.createMap().apply {
                    putString("status", "no_job")
                })
            }
        } catch (e: Exception) {
            promise.reject("OBSERVE_ERROR", e.message, e)
        }
    }

    // ============================================================
    // 📡 Broadcast Receivers for Progress
    // ============================================================
    private fun registerProgressReceivers() {
        if (isReceiverRegistered) return
        
        // Progress receiver
        progressReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val params = Arguments.createMap().apply {
                    putInt("current", intent.getIntExtra("current", 0))
                    putInt("total", intent.getIntExtra("total", 0))
                    putInt("progress", intent.getIntExtra("progress", 0))
                    putInt("sent", intent.getIntExtra("sent", 0))
                    putInt("failed", intent.getIntExtra("failed", 0))
                }
                sendEvent(EVENT_PROGRESS, params)
            }
        }
        
        // Complete receiver
        completeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val params = Arguments.createMap().apply {
                    putInt("sent", intent.getIntExtra("sent", 0))
                    putInt("failed", intent.getIntExtra("failed", 0))
                    putInt("delivered", intent.getIntExtra("delivered", 0))
                }
                sendEvent(EVENT_COMPLETE, params)
                
                // Cleanup after completion
                unregisterProgressReceivers()
            }
        }
        
        val progressFilter = IntentFilter(BulkSmsSendingWorker.PROGRESS_UPDATE_ACTION)
        val completeFilter = IntentFilter(BulkSmsSendingWorker.BULK_SEND_COMPLETE_ACTION)
        
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                ctx.registerReceiver(progressReceiver, progressFilter, Context.RECEIVER_EXPORTED)
                ctx.registerReceiver(completeReceiver, completeFilter, Context.RECEIVER_EXPORTED)
            } else {
                ctx.registerReceiver(progressReceiver, progressFilter)
                ctx.registerReceiver(completeReceiver, completeFilter)
            }
            isReceiverRegistered = true
            Log.d(TAG, "✅ Progress receivers registered")
        } catch (e: Exception) {
            Log.e(TAG, "⚠️ Failed to register progress receivers", e)
        }
    }
    
    private fun unregisterProgressReceivers() {
        if (!isReceiverRegistered) return
        
        try {
            progressReceiver?.let { ctx.unregisterReceiver(it) }
            completeReceiver?.let { ctx.unregisterReceiver(it) }
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Error unregistering receivers", e)
        }
        
        progressReceiver = null
        completeReceiver = null
        isReceiverRegistered = false
    }

    // ============================================================
    // 📢 Event Emitter
    // ============================================================
    private fun sendEvent(eventName: String, params: WritableMap) {
        if (ctx.hasActiveCatalystInstance()) {
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    // ============================================================
    // 🧹 Lifecycle Cleanup
    // ============================================================
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        unregisterProgressReceivers()
        Log.d(TAG, "🧹 Module destroyed, receivers cleaned up")
    }
}
