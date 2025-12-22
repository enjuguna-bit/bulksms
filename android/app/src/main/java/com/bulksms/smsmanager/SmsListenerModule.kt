package com.bulksms.smsmanager

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

/**
 * ✅ SmsListenerModule
 * ------------------------------------------------------------
 * Emits "onSmsReceived" events to JavaScript:
 * { phone: string, body: string, timestamp: number }
 * ------------------------------------------------------------
 * Acts as a bridge between the native SmsReceiver and the JS layer.
 * internal BroadcastReceiver has been removed in favor of the
 * manifest-registered SmsReceiver to avoid duplicates.
 */
class SmsListenerModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "SmsListenerModule"

  override fun initialize() {
    super.initialize()
    reactContextRef = WeakReference(ctx)
    Log.d(TAG, "🟢 SmsListenerModule initialized")
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    reactContextRef?.clear()
    reactContextRef = null
    Log.d(TAG, "🔴 SmsListenerModule destroyed")
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by RN event emitter contract (no-op)
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by RN event emitter contract (no-op)
  }

  companion object {
    private const val TAG = "SmsListenerModule"
    private var reactContextRef: WeakReference<ReactApplicationContext>? = null

    /**
     * Static method to send SMS events from SmsReceiver or other native components.
     */
    fun sendEventToJs(sender: String, body: String, timestamp: Long) {
      val context = reactContextRef?.get()
      if (context != null && context.hasActiveCatalystInstance()) {
        try {
          val map = Arguments.createMap().apply {
            putString("phone", sender)
            putString("body", body)
            putDouble("timestamp", timestamp.toDouble())
          }

          context
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onSmsReceived", map)
          
          Log.d(TAG, "🚀 Dispatching SMS to JS: $sender")
        } catch (e: Exception) {
          Log.e(TAG, "❌ Failed to send event to JS", e)
        }
      } else {
        Log.w(TAG, "⚠️ ReactContext not active, dropping SMS from $sender")
      }
    }

    /**
     * ✅ Static method to send keyword events from SmsReceiver.
     * Emits "onSmsKeyword" event: { phone: string, keyword: string, action: string }
     * 
     * @param sender The phone number that sent the keyword
     * @param keyword The detected keyword (BAL, STOP, INFO, HELP)
     * @param action The action type (balance_request, opt_out, info_request, help_request)
     */
    fun sendKeywordEventToJs(sender: String, keyword: String, action: String) {
      val context = reactContextRef?.get()
      if (context != null && context.hasActiveCatalystInstance()) {
        try {
          val map = Arguments.createMap().apply {
            putString("phone", sender)
            putString("keyword", keyword)
            putString("action", action)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
          }

          context
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onSmsKeyword", map)
          
          Log.d(TAG, "🔑 Dispatching keyword event to JS: $keyword from $sender")
        } catch (e: Exception) {
          Log.e(TAG, "❌ Failed to send keyword event to JS", e)
        }
      } else {
        Log.w(TAG, "⚠️ ReactContext not active, dropping keyword $keyword from $sender")
      }
    }
  }
}

