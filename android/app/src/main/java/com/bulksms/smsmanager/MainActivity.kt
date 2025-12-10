// ===========================================================
// 📱 MainActivity.kt — React Native CLI + Default SMS Handler
// -----------------------------------------------------------
// • React Native 0.76.x / Kotlin 1.9.24 / Android 14 (SDK 35)
// • Handles SMS permissions and default role requests
// • Fully CLI-native (no Expo imports)
// ===========================================================

package com.bulksms.smsmanager

import android.Manifest
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Telephony
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  // ------------------------------------------------------------
  // 🚨 Runtime Permission Request Launcher
  // ------------------------------------------------------------
  private val requestPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
      val sendSms = permissions[Manifest.permission.SEND_SMS] == true
      val readSms = permissions[Manifest.permission.READ_SMS] == true
      val receiveSms = permissions[Manifest.permission.RECEIVE_SMS] == true

      if (sendSms && readSms && receiveSms) {
        Toast.makeText(this, "SMS permissions granted", Toast.LENGTH_SHORT).show()
      } else {
        Toast.makeText(this, "Some SMS permissions are missing", Toast.LENGTH_LONG).show()
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Request SMS permissions on startup
    requestSmsPermissions()

    // Optionally prompt to become default SMS app
    if (!isDefaultSmsApp()) {
      promptDefaultSmsRole()
    }
  }

  // ------------------------------------------------------------
  // 🔐 SMS Permission Flow
  // ------------------------------------------------------------
  private fun requestSmsPermissions() {
    val permissions = arrayOf(
      Manifest.permission.SEND_SMS,
      Manifest.permission.RECEIVE_SMS,
      Manifest.permission.READ_SMS
    )

    requestPermissionLauncher.launch(permissions)
  }

  private fun promptDefaultSmsRole() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = getSystemService(RoleManager::class.java)
      val roleRequestIntent = roleManager
        ?.createRequestRoleIntent(RoleManager.ROLE_SMS)

      if (roleRequestIntent != null) {
        startActivity(roleRequestIntent)
      }
    } else {
      val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
      intent.putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, packageName)
      startActivity(intent)
    }
  }

  private fun isDefaultSmsApp(): Boolean {
    return packageName == Telephony.Sms.getDefaultSmsPackage(this)
  }

  // ------------------------------------------------------------
  // 📨 Handle Incoming Intents (SMS, Deep Links, etc.)
  // ------------------------------------------------------------
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    // Optional: forward to JS layer via NativeModules if needed
  }

  // ------------------------------------------------------------
  // React Navigation integration
  // ------------------------------------------------------------
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(
      this,
      mainComponentName,
      // Fabric disabled for now to keep Old Architecture stable
      false,
      false
    )
  }

  override fun getMainComponentName(): String = "bulksms"
}
