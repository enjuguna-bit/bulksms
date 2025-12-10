package com.bulksms.smsmanager

import com.bulksms.smsmanager.DevBypassManager
import com.facebook.react.bridge.*

/**
 * ✅ DevBypassBridgeModule
 * ------------------------------------------------------------
 * Exposes developer bypass or trial unlock info to JavaScript.
 * Reads flags like DEV_BYPASS and EXPO_PUBLIC_DEVELOPER_BYPASS.
 * Used by BillingProvider / PaywallScreen for developer testing.
 * ------------------------------------------------------------
 */
class DevBypassBridgeModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "DevBypassBridgeModule"

  @ReactMethod
  fun isDevBypassEnabled(promise: Promise) {
    val enabled = DevBypassManager.isBypassEnabled(ctx)
    promise.resolve(enabled)
  }

  @ReactMethod
  fun getBypassInfo(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("enabled", DevBypassManager.isBypassEnabled(ctx))
    promise.resolve(map)
  }
}
