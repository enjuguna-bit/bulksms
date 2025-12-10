package com.bulksms.smsmanager

import android.content.Context
import android.util.Log

/**
 * ============================================================
 *  DevBypassManager — Production-safe & CLI-compatible
 * ------------------------------------------------------------
 *  • Checks BuildConfig flags injected by dotenv.gradle
 *  • Handles Boolean, String, missing, or mis-typed fields
 *  • No Expo dependencies (only names preserved for compatibility)
 *  • Zero crashes if fields do not exist
 * ============================================================
 */
object DevBypassManager {

  private const val TAG = "DevBypassManager"

  /**
   * ------------------------------------------------------------
   *  Returns TRUE if any bypass flag is enabled:
   *    • DEV_BYPASS=true
   *    • EXPO_PUBLIC_DEVELOPER_BYPASS=true
   *
   *  These flags come from:
   *    - android/app/.env  (via dotenv.gradle)
   *    - BuildConfig fields
   *
   *  Safe on all builds:
   *    • Debug
   *    • Release
   *    • Signed APK
   * ------------------------------------------------------------
   */
  fun isBypassEnabled(context: Context): Boolean {
    return try {
      val devBypass = getBooleanField("DEV_BYPASS")
      val expoBypass = getBooleanField("EXPO_PUBLIC_DEVELOPER_BYPASS")

      val enabled = devBypass || expoBypass

      Log.d(TAG, "Bypass check → DEV_BYPASS=$devBypass | EXPO_PUBLIC_DEVELOPER_BYPASS=$expoBypass | enabled=$enabled")

      enabled
    } catch (e: Exception) {
      Log.w(TAG, "⚠️ isBypassEnabled failed: ${e.message}")
      false
    }
  }

  /**
   * ------------------------------------------------------------
   *  Reads a boolean BuildConfig field gracefully.
   *  Supports:
   *     Boolean
   *     String "true"/"false"
   *     Missing fields → SAFE default false
   * ------------------------------------------------------------
   */
  private fun getBooleanField(name: String): Boolean {
    return try {
      val clazz = com.bulksms.smsmanager.BuildConfig::class.java
      val field = clazz.getField(name)
      val value = field.get(null)

      when (value) {
        is Boolean -> value
        is String -> value.equals("true", ignoreCase = true)
        else -> false
      }
    } catch (e: NoSuchFieldException) {
      false
    } catch (e: Exception) {
      Log.w(TAG, "⚠️ Failed reading BuildConfig field '$name': ${e.message}")
      false
    }
  }
}
