package com.bulksms.smsmanager

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * ✅ SmsPackage
 * ------------------------------------------------------------
 * Registers all native SMS-related modules for React Native.
 * Works with RN 0.76+ (CLI build).
 *
 * Included modules:
 *  - SmsReaderModule → Reads inbox & parses M-PESA messages
 *  - SmsSenderModule → Sends SMS (single/multipart, dual-SIM)
 *  - SmsListenerModule → Emits incoming SMS to JS
 *  - RoleHelperModule → Checks default SMS handler role
 *  - DefaultSmsRoleModule → Requests system default SMS role
 *  - DevBypassBridgeModule → Exposes developer bypass flags
 * ------------------------------------------------------------
 */
class SmsPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      SmsReaderModule(reactContext),
      SmsSenderModule(reactContext),
      SmsListenerModule(reactContext),
      RoleHelperModule(reactContext),
      DefaultSmsRoleModule(reactContext),
      DevBypassBridgeModule(reactContext)
    )
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    // No native UI components yet
    return emptyList()
  }
}
