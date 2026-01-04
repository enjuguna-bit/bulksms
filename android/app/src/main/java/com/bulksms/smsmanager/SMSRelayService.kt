package com.bulksms.smsmanager

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.os.PowerManager
import kotlinx.coroutines.*

class SMSRelayService : Service() {
    
    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)
    private lateinit var wakeLock: PowerManager.WakeLock
    private lateinit var db: AppDatabase
    private var isServiceRunning = true

    override fun onCreate() {
        super.onCreate()
        db = AppDatabase.getDatabase(this)
        startForeground(1, createNotification())
        
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BulkSMS:RelayLock")
        wakeLock.acquire(10*60*1000L /*10 minutes*/)
        
        startQueueProcessor()
    }

    private fun startQueueProcessor() {
        scope.launch {
            while (isServiceRunning) {
                val nextMsg = db.smsDao().getNextPendingMessage()

                if (nextMsg != null) {
                    // Mark as SENDING
                    db.smsDao().updateStatus(nextMsg.id, 1)
                    
                    val success = attemptSend(nextMsg)
                    
                    if (!success) {
                        db.smsDao().markAsFailed(nextMsg.id, "Immediate Send Failure")
                    }
                    
                    delay(2000) // Prevent throttling
                } else {
                    delay(5000) // Queue empty, sleep longer
                }
            }
        }
    }

    private fun attemptSend(sms: SmsEntity): Boolean {
        return try {
            val smsManager = SimUtils.getSmsManagerForCarrier(this, if (sms.simSlot == 0) "Safaricom" else "Airtel")
            
            val sentIntent = Intent(BroadcastConstants.SMS_SENT_ACTION)
                .putExtra(BroadcastConstants.EXTRA_DB_ID, sms.id)
            val sentPI = PendingIntent.getBroadcast(
                this, sms.id.toInt(), sentIntent, PendingIntent.FLAG_IMMUTABLE
            )
            
            smsManager?.sendTextMessage(sms.phoneNumber, null, sms.messageBody, sentPI, null)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun createNotification(): Notification {
        val channelId = "SMS_RELAY_CHANNEL"
        val channel = NotificationChannel(
            channelId, 
            "SMS Relay", 
            NotificationManager.IMPORTANCE_LOW
        )
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)

        return Notification.Builder(this, channelId)
            .setContentTitle("SMS Relay Active")
            .setContentText("Processing Bulk SMS Queue...")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "ENQUEUE_MSG") {
            val phone = intent.getStringExtra("phone") ?: return START_NOT_STICKY
            val msg = intent.getStringExtra("msg") ?: return START_NOT_STICKY
            val carrier = intent.getStringExtra("sim") ?: "Safaricom"
            
            scope.launch {
                db.smsDao().insert(
                    SmsEntity(
                        phoneNumber = phone,
                        messageBody = msg,
                        simSlot = if (carrier == "Safaricom") 0 else 1,
                        status = 0,
                        createdAt = System.currentTimeMillis()
                    )
                )
            }
        }
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        isServiceRunning = false
        if (wakeLock.isHeld) wakeLock.release()
        super.onDestroy()
    }
}
