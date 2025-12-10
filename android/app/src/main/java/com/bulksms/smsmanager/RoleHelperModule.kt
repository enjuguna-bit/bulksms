package com.bulksms.smsmanager

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * ✅ RoleHelperModule
 * ------------------------------------------------------------
 * Native bridge to handle SMS role management on Android 5+.
 * - Checks if the app is the default SMS handler
 * - Opens the system dialog to request default SMS role
 * ------------------------------------------------------------
 */
class RoleHelperModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RoleHelperModule"

  override fun canOverrideExistingModule(): Boolean = true

  // ------------------------------------------------------------
  // 🔍 Check if this app is the current default SMS handler
  // ------------------------------------------------------------
  @ReactMethod
  fun isDefaultSmsApp(promise: Promise) {
    try {
      val currentDefault = Telephony.Sms.getDefaultSmsPackage(reactContext)
      val isDefault = currentDefault == reactContext.packageName
      promise.resolve(isDefault)
    } catch (e: Exception) {
      promise.reject("ROLE_CHECK_ERROR", e.message, e)
    }
  }

  // ------------------------------------------------------------
  // ⚙️ Open system dialog to request default SMS role
  // ------------------------------------------------------------
  @ReactMethod
  fun openSmsRoleIntent() {
    val intent = createSmsRoleIntent(reactContext)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  // ------------------------------------------------------------
  // 🧠 Alias: requestDefaultSmsRole for JS compatibility
  // ------------------------------------------------------------
  @ReactMethod
  fun requestDefaultSmsRole(promise: Promise) {
    try {
      val intent = createSmsRoleIntent(reactContext)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ROLE_REQUEST_ERROR", e.message, e)
    }
  }

  // ------------------------------------------------------------
  // 🧩 Helper: Creates proper Intent depending on Android version
  // ------------------------------------------------------------
  private fun createSmsRoleIntent(context: Context): Intent {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = context.getSystemService(RoleManager::class.java)
      roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
    } else {
      Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
        .putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, context.packageName)
    }
  }
}
