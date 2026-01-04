package com.bulksms.smsmanager

import android.Manifest
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
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

  private var server: LocalSmsServer? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // React Native Screens (react-native-screens) requirement: pass null
    super.onCreate(null)

    // Request SMS permissions on startup
    requestSmsPermissions()

    // Optionally prompt to become default SMS app
    if (!isDefaultSmsApp()) {
      promptDefaultSmsRole()
    }

    // Start server
    try {
      server = LocalSmsServer(this)
      server?.start()
      
      val wifiManager = getSystemService(Context.WIFI_SERVICE) as android.net.wifi.WifiManager
      val ipAddress = android.text.format.Formatter.formatIpAddress(wifiManager.connectionInfo.ipAddress)
      Toast.makeText(this, "Server running at http://$ipAddress:8080", Toast.LENGTH_LONG).show()
    } catch (e: Exception) {
      Toast.makeText(this, "Failed to start server: ${e.message}", Toast.LENGTH_SHORT).show()
    }
  }

  override fun onDestroy() {
    server?.stop()
    super.onDestroy()
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
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
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
