package com.bulksms.smsmanager

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.*
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.min
import kotlin.math.pow

/**
 * ✅ BulkSmsSendingWorker — Production-Grade Bulk SMS Service
 * ------------------------------------------------------------
 * Android best practices implementation for bulk SMS sending:
 * 
 * • WorkManager-based (survives process death, battery efficient)
 * • Android 14+ compliant with proper foreground service type
 * • Per-message delivery tracking with PendingIntent callbacks
 * • Configurable carrier-safe delays (1-3 seconds)
 * • Exponential backoff for retries
 * • Live notification progress updates
 * • Graceful cancellation support
 * • Structured concurrency with coroutines
 * • Events broadcast to React Native layer
 * ------------------------------------------------------------
 */
class BulkSmsSendingWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    // ============================================================
    // 📊 Configuration
    // ============================================================
    companion object {
        private const val TAG = "BulkSmsSendingWorker"
        
        // Intent actions for delivery tracking
        const val SMS_SENT_ACTION = "com.bulksms.smsmanager.BULK_SMS_SENT"
        const val SMS_DELIVERED_ACTION = "com.bulksms.smsmanager.BULK_SMS_DELIVERED"
        
        // Progress broadcast action (for React Native)
        const val PROGRESS_UPDATE_ACTION = "com.bulksms.smsmanager.BULK_SMS_PROGRESS"
        const val BULK_SEND_COMPLETE_ACTION = "com.bulksms.smsmanager.BULK_SMS_COMPLETE"
        
        // Notification
        private const val NOTIFICATION_CHANNEL_ID = "bulk_sms_sending_channel"
        private const val NOTIFICATION_ID = 2001
        
        // Input data keys
        const val KEY_RECIPIENTS = "recipients"
        const val KEY_MESSAGE = "message"
        const val KEY_SIM_SLOT = "sim_slot"
        const val KEY_DELAY_MS = "delay_ms"
        const val KEY_MAX_RETRIES = "max_retries"
        
        // Output data keys
        const val KEY_TOTAL_SENT = "total_sent"
        const val KEY_TOTAL_FAILED = "total_failed"
        const val KEY_TOTAL_DELIVERED = "total_delivered"
        
        // Defaults
        private const val DEFAULT_DELAY_MS = 1500L  // 1.5 seconds between messages
        private const val DEFAULT_MAX_RETRIES = 3
        private const val MIN_DELAY_MS = 750L       // Minimum 0.75 seconds
        private const val MAX_DELAY_MS = 3000L      // Maximum 3 seconds
        private const val BASE_BACKOFF_MS = 2000L   // 2 seconds base for exponential backoff
        
        // Work request builder
        fun buildWorkRequest(
            recipients: Array<String>,
            message: String,
            simSlot: Int = 0,
            delayMs: Long = DEFAULT_DELAY_MS,
            maxRetries: Int = DEFAULT_MAX_RETRIES
        ): OneTimeWorkRequest {
            val inputData = Data.Builder()
                .putStringArray(KEY_RECIPIENTS, recipients)
                .putString(KEY_MESSAGE, message)
                .putInt(KEY_SIM_SLOT, simSlot)
                .putLong(KEY_DELAY_MS, delayMs.coerceIn(MIN_DELAY_MS, MAX_DELAY_MS))
                .putInt(KEY_MAX_RETRIES, maxRetries)
                .build()
            
            return OneTimeWorkRequestBuilder<BulkSmsSendingWorker>()
                .setInputData(inputData)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .addTag(TAG)
                .build()
        }
    }

    // ============================================================
    // 📈 State Tracking
    // ============================================================
    private val requestCodeGenerator = AtomicInteger(System.currentTimeMillis().toInt())
    private val sentCount = AtomicInteger(0)
    private val failedCount = AtomicInteger(0)
    private val deliveredCount = AtomicInteger(0)
    private val pendingDeliveryConfirmations = mutableSetOf<Int>()
    
    // Receiver for sent/delivered callbacks
    private var smsStatusReceiver: BroadcastReceiver? = null
    private var isReceiverRegistered = false

    // ============================================================
    // 🚀 Main Execution
    // ============================================================
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.i(TAG, "🚀 Starting bulk SMS sending job")
        
        // Extract input data
        val recipients = inputData.getStringArray(KEY_RECIPIENTS)
        val message = inputData.getString(KEY_MESSAGE)
        val simSlot = inputData.getInt(KEY_SIM_SLOT, 0)
        val delayMs = inputData.getLong(KEY_DELAY_MS, DEFAULT_DELAY_MS)
        val maxRetries = inputData.getInt(KEY_MAX_RETRIES, DEFAULT_MAX_RETRIES)
        
        // Validate input
        if (recipients.isNullOrEmpty() || message.isNullOrBlank()) {
            Log.e(TAG, "❌ Invalid input: recipients or message is empty")
            return@withContext Result.failure(
                Data.Builder()
                    .putString("error", "Invalid input: recipients or message is empty")
                    .build()
            )
        }
        
        // Check SMS permission
        if (!hasSmsPermission()) {
            Log.e(TAG, "❌ SEND_SMS permission not granted")
            return@withContext Result.failure(
                Data.Builder()
                    .putString("error", "SEND_SMS permission not granted")
                    .build()
            )
        }
        
        // Setup foreground notification
        try {
            setForeground(createForegroundInfo(0, recipients.size))
        } catch (e: Exception) {
            Log.e(TAG, "⚠️ Failed to start foreground service, continuing anyway", e)
        }
        
        // Register delivery tracking receiver
        registerSmsStatusReceiver()
        
        try {
            // Process each recipient
            sendToAllRecipients(recipients, message, simSlot, delayMs, maxRetries)
            
            // Wait a bit for final delivery reports (up to 10 seconds)
            waitForPendingDeliveryReports(10_000L)
            
            // Build result data
            val outputData = Data.Builder()
                .putInt(KEY_TOTAL_SENT, sentCount.get())
                .putInt(KEY_TOTAL_FAILED, failedCount.get())
                .putInt(KEY_TOTAL_DELIVERED, deliveredCount.get())
                .build()
            
            // Broadcast completion to React Native
            broadcastCompletion()
            
            Log.i(TAG, "✅ Bulk SMS job completed. Sent: ${sentCount.get()}, Failed: ${failedCount.get()}, Delivered: ${deliveredCount.get()}")
            
            return@withContext if (failedCount.get() == 0) {
                Result.success(outputData)
            } else if (sentCount.get() > 0) {
                // Partial success
                Result.success(outputData)
            } else {
                Result.failure(outputData)
            }
            
        } catch (e: CancellationException) {
            Log.w(TAG, "⚠️ Job was cancelled")
            return@withContext Result.failure(
                Data.Builder()
                    .putString("error", "Job cancelled")
                    .putInt(KEY_TOTAL_SENT, sentCount.get())
                    .build()
            )
        } catch (e: Exception) {
            Log.e(TAG, "❌ Unexpected error during bulk SMS", e)
            return@withContext Result.failure(
                Data.Builder()
                    .putString("error", e.message ?: "Unknown error")
                    .build()
            )
        } finally {
            unregisterSmsStatusReceiver()
        }
    }

    // ============================================================
    // 📤 Send to All Recipients
    // ============================================================
    private suspend fun sendToAllRecipients(
        recipients: Array<String>,
        message: String,
        simSlot: Int,
        delayMs: Long,
        maxRetries: Int
    ) {
        val totalRecipients = recipients.size
        val smsManager = getSmsManager(simSlot)
        
        for ((index, recipient) in recipients.withIndex()) {
            // Check for cancellation
            if (isStopped) {
                Log.w(TAG, "⚠️ Job stopped. Processed ${index}/${totalRecipients}")
                break
            }
            
            // Clean phone number
            val cleanNumber = cleanPhoneNumber(recipient)
            if (cleanNumber.isBlank()) {
                Log.w(TAG, "⚠️ Invalid phone number: $recipient")
                failedCount.incrementAndGet()
                continue
            }
            
            // Send with retry logic
            val success = sendSmsWithRetry(smsManager, cleanNumber, message, maxRetries)
            
            if (success) {
                sentCount.incrementAndGet()
            } else {
                failedCount.incrementAndGet()
            }
            
            // Update progress
            val progress = ((index + 1) * 100) / totalRecipients
            updateProgressNotification(index + 1, totalRecipients, progress)
            broadcastProgress(index + 1, totalRecipients, progress, sentCount.get(), failedCount.get())
            
            // Delay between messages (carrier safety)
            if (index < totalRecipients - 1 && !isStopped) {
                delay(delayMs)
            }
        }
    }

    // ============================================================
    // 📨 Send SMS with Retry Logic
    // ============================================================
    private suspend fun sendSmsWithRetry(
        smsManager: SmsManager,
        phoneNumber: String,
        message: String,
        maxRetries: Int
    ): Boolean {
        var attempt = 0
        var lastError: Exception? = null
        
        while (attempt < maxRetries) {
            try {
                if (isStopped) return false
                
                val requestCode = requestCodeGenerator.getAndIncrement()
                
                // Create PendingIntents for tracking
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                
                val sentIntent = PendingIntent.getBroadcast(
                    appContext,
                    requestCode,
                    Intent(SMS_SENT_ACTION).apply {
                        putExtra("id", requestCode)
                        putExtra("phone", phoneNumber)
                    },
                    flags
                )
                
                val deliveredIntent = PendingIntent.getBroadcast(
                    appContext,
                    requestCode + 100000, // Offset to avoid collision
                    Intent(SMS_DELIVERED_ACTION).apply {
                        putExtra("id", requestCode)
                        putExtra("phone", phoneNumber)
                    },
                    flags
                )
                
                // Track pending delivery
                synchronized(pendingDeliveryConfirmations) {
                    pendingDeliveryConfirmations.add(requestCode)
                }
                
                // Send SMS (handle multipart messages)
                if (message.length > 160) {
                    val parts = smsManager.divideMessage(message)
                    val sentIntents = ArrayList<PendingIntent>(parts.size).apply {
                        repeat(parts.size) { add(sentIntent) }
                    }
                    val deliveredIntents = ArrayList<PendingIntent>(parts.size).apply {
                        repeat(parts.size) { add(deliveredIntent) }
                    }
                    smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, deliveredIntents)
                } else {
                    smsManager.sendTextMessage(phoneNumber, null, message, sentIntent, deliveredIntent)
                }
                
                // Log success (redacted for privacy)
                if (BuildConfig.DEBUG) {
                    val redacted = if (phoneNumber.length > 4) "***${phoneNumber.takeLast(4)}" else "***"
                    Log.d(TAG, "✅ SMS queued to $redacted (attempt ${attempt + 1})")
                }
                
                return true
                
            } catch (e: SecurityException) {
                Log.e(TAG, "❌ Security exception sending SMS", e)
                lastError = e
                break // Don't retry security exceptions
                
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Failed attempt ${attempt + 1}/$maxRetries: ${e.message}")
                lastError = e
                attempt++
                
                // Exponential backoff
                if (attempt < maxRetries) {
                    val backoffDelay = (BASE_BACKOFF_MS * 2.0.pow(attempt.toDouble())).toLong()
                    val cappedDelay = min(backoffDelay, 30_000L)
                    Log.d(TAG, "⏳ Waiting ${cappedDelay}ms before retry")
                    delay(cappedDelay)
                }
            }
        }
        
        Log.e(TAG, "❌ Failed to send SMS after $maxRetries attempts: ${lastError?.message}")
        return false
    }

    // ============================================================
    // 📡 Delivery Status Receiver
    // ============================================================
    private fun registerSmsStatusReceiver() {
        smsStatusReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val messageId = intent.getIntExtra("id", -1)
                val phone = intent.getStringExtra("phone") ?: "unknown"
                
                when (intent.action) {
                    SMS_SENT_ACTION -> {
                        val (status, errorReason) = when (resultCode) {
                            Activity.RESULT_OK -> "sent" to null
                            SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "failed" to "GENERIC_FAILURE"
                            SmsManager.RESULT_ERROR_NO_SERVICE -> "failed" to "NO_SERVICE"
                            SmsManager.RESULT_ERROR_NULL_PDU -> "failed" to "NULL_PDU"
                            SmsManager.RESULT_ERROR_RADIO_OFF -> "failed" to "RADIO_OFF"
                            SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> "failed" to "LIMIT_EXCEEDED"
                            else -> "failed" to "UNKNOWN_ERROR"
                        }
                        
                        if (BuildConfig.DEBUG) {
                            Log.d(TAG, "📤 SMS Sent callback: id=$messageId status=$status error=$errorReason")
                        }
                    }
                    
                    SMS_DELIVERED_ACTION -> {
                        if (resultCode == Activity.RESULT_OK) {
                            deliveredCount.incrementAndGet()
                            if (BuildConfig.DEBUG) {
                                Log.d(TAG, "📬 SMS Delivered: id=$messageId")
                            }
                        }
                        
                        // Remove from pending
                        synchronized(pendingDeliveryConfirmations) {
                            pendingDeliveryConfirmations.remove(messageId)
                        }
                    }
                }
            }
        }
        
        val filter = IntentFilter().apply {
            addAction(SMS_SENT_ACTION)
            addAction(SMS_DELIVERED_ACTION)
        }
        
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                appContext.registerReceiver(smsStatusReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                appContext.registerReceiver(smsStatusReceiver, filter)
            }
            isReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "⚠️ Failed to register SMS status receiver", e)
        }
    }
    
    private fun unregisterSmsStatusReceiver() {
        if (isReceiverRegistered && smsStatusReceiver != null) {
            try {
                appContext.unregisterReceiver(smsStatusReceiver)
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Error unregistering receiver", e)
            }
            isReceiverRegistered = false
        }
    }
    
    private suspend fun waitForPendingDeliveryReports(maxWaitMs: Long) {
        val startTime = System.currentTimeMillis()
        while (System.currentTimeMillis() - startTime < maxWaitMs) {
            val pending = synchronized(pendingDeliveryConfirmations) { pendingDeliveryConfirmations.size }
            if (pending == 0) break
            delay(500)
        }
    }

    // ============================================================
    // 🔔 Notification Management
    // ============================================================
    private fun createForegroundInfo(current: Int, total: Int): ForegroundInfo {
        createNotificationChannel()
        
        val notification = NotificationCompat.Builder(appContext, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Sending Bulk SMS")
            .setContentText("Sending $current of $total messages...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setProgress(total, current, false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .build()
        
        return if (Build.VERSION.SDK_INT >= 34) {
            ForegroundInfo(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Bulk SMS Sending",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows progress while sending bulk SMS messages"
                setShowBadge(false)
            }
            
            val manager = appContext.getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
    
    private suspend fun updateProgressNotification(current: Int, total: Int, progress: Int) {
        try {
            setForeground(createForegroundInfo(current, total))
        } catch (e: Exception) {
            // Ignore notification update errors
        }
    }

    // ============================================================
    // 📢 React Native Broadcasting
    // ============================================================
    private fun broadcastProgress(current: Int, total: Int, progress: Int, sent: Int, failed: Int) {
        val intent = Intent(PROGRESS_UPDATE_ACTION).apply {
            putExtra("current", current)
            putExtra("total", total)
            putExtra("progress", progress)
            putExtra("sent", sent)
            putExtra("failed", failed)
        }
        appContext.sendBroadcast(intent)
    }
    
    private fun broadcastCompletion() {
        val intent = Intent(BULK_SEND_COMPLETE_ACTION).apply {
            putExtra("sent", sentCount.get())
            putExtra("failed", failedCount.get())
            putExtra("delivered", deliveredCount.get())
        }
        appContext.sendBroadcast(intent)
    }

    // ============================================================
    // 🛠️ Utilities
    // ============================================================
    private fun hasSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            appContext,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun getSmsManager(simSlot: Int): SmsManager {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val subMgr = appContext.getSystemService(SubscriptionManager::class.java)
            
            if (subMgr != null) {
                try {
                    val infoList = subMgr.activeSubscriptionInfoList
                    if (infoList != null) {
                        val subInfo = infoList.find { it.simSlotIndex == simSlot }
                            ?: infoList.firstOrNull()
                        
                        if (subInfo != null) {
                            return appContext.getSystemService(SmsManager::class.java)
                                .createForSubscriptionId(subInfo.subscriptionId)
                        }
                    }
                } catch (e: SecurityException) {
                    Log.w(TAG, "⚠️ READ_PHONE_STATE missing, using default SmsManager")
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Error accessing SubscriptionManager", e)
                }
            }
            return appContext.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            return SmsManager.getDefault()
        }
    }
    
    private fun cleanPhoneNumber(phone: String): String {
        // Remove all non-digit characters except leading +
        val cleaned = phone.trim()
        return if (cleaned.startsWith("+")) {
            "+" + cleaned.substring(1).filter { it.isDigit() }
        } else {
            cleaned.filter { it.isDigit() }
        }
    }
}
