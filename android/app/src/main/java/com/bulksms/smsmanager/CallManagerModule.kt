package com.bulksms.smsmanager

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionListener

/**
 * 📞 CallManagerModule — Native Dual-SIM Call Handler
 * ---------------------------------------------------
 * • Makes phone calls with SIM selection support
 * • Gets available SIM information
 * • Handles CALL_PHONE permission requests
 * • Provides SIM selection UI for dual-SIM devices
 * ---------------------------------------------------
 */
class CallManagerModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "CallManagerModule"

  /**
   * 📱 Get available SIM cards information
   */
  @ReactMethod
  fun getAvailableSims(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
        // No multi-SIM support before Lollipop
        promise.resolve(Arguments.createArray())
        return
      }

      val subscriptionManager = ctx.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
      if (subscriptionManager == null) {
        promise.reject("SUBSCRIPTION_MANAGER_UNAVAILABLE", "SubscriptionManager not available")
        return
      }

      val permission = ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_PHONE_STATE)
      if (permission != PackageManager.PERMISSION_GRANTED) {
        promise.reject("READ_PHONE_STATE_PERMISSION_DENIED", "READ_PHONE_STATE permission required for SIM info. Please grant this permission in app settings.")
        return
      }

      val simList = subscriptionManager.activeSubscriptionInfoList
      val result = Arguments.createArray()

      simList?.forEach { simInfo ->
        val simData = Arguments.createMap().apply {
          putInt("subscriptionId", simInfo.subscriptionId)
          putInt("simSlotIndex", simInfo.simSlotIndex)
          putString("displayName", simInfo.displayName?.toString() ?: "SIM ${simInfo.simSlotIndex + 1}")
          putString("carrierName", simInfo.carrierName?.toString() ?: "Unknown")
          putString("countryIso", simInfo.countryIso ?: "")
          putString("number", simInfo.number ?: "")
          putInt("mcc", simInfo.mcc)
          putInt("mnc", simInfo.mnc)
        }
        result.pushMap(simData)
      }

      promise.resolve(result)
    } catch (e: SecurityException) {
      Log.e(TAG, "Security exception getting SIM info", e)
      promise.reject("READ_PHONE_STATE_PERMISSION_DENIED", "READ_PHONE_STATE permission denied. Please grant this permission in app settings.", e)
    } catch (e: Exception) {
      Log.e(TAG, "Error getting SIM info", e)
      promise.reject("SIM_INFO_ERROR", "Failed to retrieve SIM information: ${e.message}", e)
    }
  }

  /**
   * 📞 Make a call with optional SIM selection
   */
  @ReactMethod
  fun makeCall(phoneNumber: String, subscriptionId: Int?, promise: Promise) {
    try {
      if (phoneNumber.isBlank()) {
        promise.reject("INVALID_ARGS", "Phone number is required")
        return
      }

      val permission = ContextCompat.checkSelfPermission(ctx, Manifest.permission.CALL_PHONE)
      if (permission != PackageManager.PERMISSION_GRANTED) {
        promise.reject("CALL_PHONE_PERMISSION_DENIED", "CALL_PHONE permission required. Please grant this permission in app settings.")
        return
      }

      val intent = Intent(Intent.ACTION_CALL).apply {
        data = Uri.parse("tel:$phoneNumber")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK

        // Set SIM subscription if provided and supported
        if (subscriptionId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          putExtra("android.telecom.extra.PHONE_ACCOUNT_HANDLE", subscriptionId)

          // Verify the SIM exists before attempting call
          val subscriptionManager = ctx.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
          val simExists = subscriptionManager?.activeSubscriptionInfoList?.any { it.subscriptionId == subscriptionId } ?: false

          if (!simExists) {
            promise.reject("SIM_NOT_FOUND", "Selected SIM card is not available or accessible")
            return
          }
        }
      }

      ctx.startActivity(intent)
      promise.resolve(Arguments.createMap().apply {
        putBoolean("success", true)
        putString("message", "Call initiated successfully")
      })

    } catch (e: SecurityException) {
      Log.e(TAG, "Security exception making call", e)
      promise.reject("CALL_PHONE_PERMISSION_DENIED", "CALL_PHONE permission denied. Please grant this permission in app settings.", e)
    } catch (e: Exception) {
      Log.e(TAG, "Error making call", e)
      promise.reject("CALL_ERROR", "Failed to initiate call: ${e.message}", e)
    }
  }

  /**
   * 🔍 Check if device has multiple SIMs
   */
  @ReactMethod
  fun hasMultipleSims(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
        promise.resolve(false)
        return
      }

      val subscriptionManager = ctx.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
      val simCount = subscriptionManager?.activeSubscriptionInfoList?.size ?: 1
      promise.resolve(simCount > 1)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /**
   * 📋 Check if CALL_PHONE permission is granted
   */
  @ReactMethod
  fun canMakeCalls(promise: Promise) {
    try {
      val permission = ContextCompat.checkSelfPermission(ctx, Manifest.permission.CALL_PHONE)
      promise.resolve(permission == PackageManager.PERMISSION_GRANTED)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  companion object {
    private const val TAG = "CallManagerModule"
  }
}
