package com.bulksms.smsmanager

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import com.facebook.react.bridge.*

/**
 * ✅ DefaultSmsRoleModule
 * ------------------------------------------------------------
 * Handles Android default-SMS role request with full result handling.
 * Works across Android 5.0 – 14.
 * ------------------------------------------------------------
 */
class DefaultSmsRoleModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx), ActivityEventListener {

  override fun getName(): String = "DefaultSmsRoleModule"

  private var rolePromise: Promise? = null

  init {
    ctx.addActivityEventListener(this)
  }

  // ------------------------------------------------------------
  // 🔍 Check if the app is the default SMS handler
  // ------------------------------------------------------------
  @ReactMethod
  fun isDefaultSmsApp(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Activity not available")
      return
    }
    try {
      val isDefault = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val rm = activity.getSystemService(RoleManager::class.java)
        rm.isRoleAvailable(RoleManager.ROLE_SMS) && rm.isRoleHeld(RoleManager.ROLE_SMS)
      } else {
        Telephony.Sms.getDefaultSmsPackage(activity) == activity.packageName
      }
      promise.resolve(isDefault)
    } catch (e: Exception) {
      promise.reject("SMS_ROLE_ERROR", e.message, e)
    }
  }

  // ------------------------------------------------------------
  // ⚙️ Request to become the default SMS app
  // ------------------------------------------------------------
  @ReactMethod
  fun requestDefaultSmsApp(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Activity not available")
      return
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = activity.getSystemService(RoleManager::class.java)
        if (!roleManager.isRoleAvailable(RoleManager.ROLE_SMS)) {
          promise.reject("ROLE_NOT_AVAILABLE", "ROLE_SMS not available on this device")
          return
        }
        if (roleManager.isRoleHeld(RoleManager.ROLE_SMS)) {
          promise.resolve(true)
          return
        }
        rolePromise = promise
        val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
        activity.startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_SMS)
      } else {
        val pkg = activity.packageName
        if (Telephony.Sms.getDefaultSmsPackage(activity) == pkg) {
          promise.resolve(true)
          return
        }
        rolePromise = promise
        val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
          putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, pkg)
        }
        activity.startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_SMS)
      }
    } catch (e: Exception) {
      promise.reject("SMS_ROLE_ERROR", e.message, e)
    }
  }

  // ------------------------------------------------------------
  // 🎯 Handle the role-request result
  // ------------------------------------------------------------
  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == REQUEST_CODE_SET_DEFAULT_SMS) {
      val promise = rolePromise
      rolePromise = null
      promise?.let {
        if (resultCode == Activity.RESULT_OK) it.resolve(true)
        else it.reject("USER_CANCELLED", "User declined to set default SMS app")
      }
    }
  }

  override fun onNewIntent(intent: Intent?) {
    // no-op
  }

  companion object {
    private const val REQUEST_CODE_SET_DEFAULT_SMS = 1001
  }
}
