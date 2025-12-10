package com.bulksms.smsmanager

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicInteger

/**
 * ✅ SmsSenderModule — Native SMS Bridge (Corrected)
 * ------------------------------------------------------------
 * • Sends SMS with sent + delivery tracking
 * • Supports dual-SIM devices
 * • Uses AtomicInteger for unique PendingIntent request codes
 * • ⚡ FIX: Added BroadcastReceiver to bridge events to JS
 * ------------------------------------------------------------
 */
class SmsSenderModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  private val requestCodeGenerator = AtomicInteger(0)
  private var isReceiverRegistered = false

  /**
   * 📡 Receiver to handle system callbacks and forward them to JS.
   * Static nested class + WeakReference prevents memory leaks.
   */
  private class SmsBroadcastReceiver(context: ReactApplicationContext) : BroadcastReceiver() {
      private val contextRef = java.lang.ref.WeakReference(context)

      override fun onReceive(context: Context, intent: Intent) {
          val reactContext = contextRef.get() ?: return

          try {
              val id = intent.getIntExtra("id", -1)
              if (id == -1) return

              val action = intent.action
              val params = Arguments.createMap()
              params.putString("id", id.toString())

              when (action) {
                  SENT_ACTION -> {
                      val success = resultCode == Activity.RESULT_OK
                      params.putString("status", if (success) "sent" else "failed")
                      if (!success) {
                          params.putInt("resultCode", resultCode)
                      }
                      sendEvent(reactContext, "SmsSentResult", params)
                      Log.d(TAG, "SMS Sent Update: ID=$id Success=$success")
                  }
                  DELIVERED_ACTION -> {
                      params.putString("status", "delivered")
                      sendEvent(reactContext, "SmsDeliveredResult", params)
                      Log.d(TAG, "SMS Delivered Update: ID=$id")
                  }
              }
          } catch (e: Exception) {
              Log.e(TAG, "Error in BroadcastReceiver", e)
          }
      }

      private fun sendEvent(reactContext: ReactApplicationContext, eventName: String, params: WritableMap) {
          if (reactContext.hasActiveCatalystInstance()) {
              reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit(eventName, params)
          }
      }
  }

  private val smsStatusReceiver = SmsBroadcastReceiver(ctx)

  init {
    val filter = IntentFilter().apply {
      addAction(SENT_ACTION)
      addAction(DELIVERED_ACTION)
    }
    
    // ⚡ FIX: Register receiver with appropriate flags for Android 14+ (API 34)
    // Wrapped in try-catch for strict lifecycle safety
    try {
      if (Build.VERSION.SDK_INT >= 34) {
          ctx.registerReceiver(smsStatusReceiver, filter, Context.RECEIVER_EXPORTED)
      } else {
          ctx.registerReceiver(smsStatusReceiver, filter)
      }
      isReceiverRegistered = true
    } catch (e: Exception) {
      Log.e(TAG, "❌ Failed to register SMS status receiver", e)
      isReceiverRegistered = false
    }
  }

  override fun getName(): String = "SmsSenderModule"

  // Required for NativeEventEmitter in JS to work without warnings
  @ReactMethod
  fun addListener(eventName: String) {}
  @ReactMethod
  fun removeListeners(count: Int) {}

  @ReactMethod
  fun sendSms(phoneNumber: String, message: String, simSlot: Int, promise: Promise) {
    try {
      if (phoneNumber.isBlank() || message.isBlank()) {
        promise.reject("INVALID_ARGS", "Phone number and message are required.")
        return
      }

      val permission = ContextCompat.checkSelfPermission(ctx, Manifest.permission.SEND_SMS)
      if (permission != PackageManager.PERMISSION_GRANTED) {
        promise.reject("PERMISSION_DENIED", "SEND_SMS permission not granted.")
        return
      }

      val smsManager = getSmsManager(simSlot)
      
      // CRITICAL: Generate unique ID for this specific SMS attempt
      val uniqueId = requestCodeGenerator.getAndIncrement()

      // Define flags: Immutable is safer for simple broadcasts, but using UPDATE_CURRENT
      // ensures our extras (ID) are attached correctly to the PendingIntent.
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      } else {
          PendingIntent.FLAG_UPDATE_CURRENT
      }

      // ⚡ FIX: Add the ID to the intent so the receiver knows which message this is
      val sentIntentRaw = Intent(SENT_ACTION).apply { putExtra("id", uniqueId) }
      val sentIntent = PendingIntent.getBroadcast(ctx, uniqueId, sentIntentRaw, flags)

      val deliveredIntentRaw = Intent(DELIVERED_ACTION).apply { putExtra("id", uniqueId) }
      val deliveredIntent = PendingIntent.getBroadcast(ctx, uniqueId, deliveredIntentRaw, flags)

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

      if (BuildConfig.DEBUG) {
        val redacted = if (phoneNumber.length > 4) "***${phoneNumber.takeLast(4)}" else "***"
        Log.i(TAG, "✅ SMS sent to $redacted via slot $simSlot (ID: $uniqueId)")
      }
      
      // Return the ID to JS so it can track this specific message
      val result = Arguments.createMap()
      result.putBoolean("success", true)
      result.putInt("id", uniqueId)
      promise.resolve(result)

    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", "SMS permission missing or not default handler.", e)
    } catch (e: Exception) {
      Log.e(TAG, "❌ Failed to send SMS", e)
      promise.reject("SMS_SEND_ERROR", e.message, e)
    }
  }

  /**
   * Safely retrieves the SmsManager.
   * Handles missing READ_PHONE_STATE permission by falling back to default.
   */
  private fun getSmsManager(simSlot: Int): SmsManager {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val subMgr = ctx.getSystemService(SubscriptionManager::class.java)
      
      if (subMgr != null) {
        try {
          // This call requires READ_PHONE_STATE. If missing, it throws SecurityException.
          val infoList = subMgr.activeSubscriptionInfoList
          
          if (infoList != null) {
             val subInfo = infoList.find { it.simSlotIndex == simSlot } 
               ?: infoList.firstOrNull() 

             if (subInfo != null) {
               return ctx.getSystemService(SmsManager::class.java)
                 .createForSubscriptionId(subInfo.subscriptionId)
             }
          }
        } catch (e: SecurityException) {
           Log.w(TAG, "⚠️ READ_PHONE_STATE missing. Cannot select SIM slot. Using default.")
        } catch (e: Exception) {
           Log.e(TAG, "⚠️ Error accessing SubscriptionManager. Using default.", e)
        }
      }
      return ctx.getSystemService(SmsManager::class.java)
    } else {
      @Suppress("DEPRECATION")
      return SmsManager.getDefault()
    }
  }

  @ReactMethod
  fun getSimCount(promise: Promise) {
    try {
      val subMgr = ctx.getSystemService(SubscriptionManager::class.java)
      val count = subMgr?.activeSubscriptionInfoList?.size ?: 1
      promise.resolve(count)
    } catch (e: Exception) {
      promise.resolve(1)
    }
  }

  @ReactMethod
  fun canSendSms(promise: Promise) {
    try {
      val permission = ContextCompat.checkSelfPermission(ctx, Manifest.permission.SEND_SMS)
      promise.resolve(permission == PackageManager.PERMISSION_GRANTED)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /**
   * ⚡ FIX: Cleanup receiver when module is destroyed to prevent leaks
   */
  /**
   * ⚡ FIX: Cleanup receiver when module is destroyed to prevent leaks
   */
  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    
    // Strict unregistration with catch-all for safety
    if (isReceiverRegistered) {
      try {
        ctx.unregisterReceiver(smsStatusReceiver)
        Log.d(TAG, "✅ SMS status receiver unregistered safely")
      } catch (e: IllegalArgumentException) {
        // Common: Receiver was already unregistered or not found
        Log.d(TAG, "⚠️ Receiver already unregistered (benign)")
      } catch (e: Exception) {
        // Catch generic exceptions to prevent app crash during destruction
        Log.e(TAG, "❌ Error unregistering receiver during destroy", e)
      } finally {
        isReceiverRegistered = false
      }
    }
  }

  companion object {
    private const val TAG = "SmsSenderModule"
    private const val SENT_ACTION = "com.bulksms.smsmanager.SMS_SENT"
    private const val DELIVERED_ACTION = "com.bulksms.smsmanager.SMS_DELIVERED"
  }
}
