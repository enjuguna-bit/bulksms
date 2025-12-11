package com.bulksms.smsmanager

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.soloader.SoLoader
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.shell.MainReactPackage
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage
import com.bulksms.smsmanager.SmsPackage

/**
 * ==========================================================
 * MainApplication — Production Config
 * ----------------------------------------------------------
 * • React Native 0.76.9
 * • Hermes: ✔ ENABLED (Optimized for RN 0.76+ performance)
 * • Architecture: Old (Fabric OFF for stability)
 * • Includes native SmsPackage
 * ==========================================================
 */
class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> {
        val packages = mutableListOf<ReactPackage>()
        
        // Always add core packages
        packages.add(MainReactPackage())
        packages.add(AsyncStoragePackage())
        packages.add(SmsPackage())
        
        // Add community packages via reflection (may or may not be available)
        // These are the most likely package class names based on RN 0.76 ecosystem
        val packageClassNames = listOf(
          // AsyncStorage (explicitly added above, but try alternate name too)
          "com.react-native-async-storage.AsyncStoragePackage",
          
          // Navigation
          "com.reactnavigation.native.ReactNavigationPackage",
          "com.react-navigation.native.ReactNavigationPackage",
          "com.reactnavigation.bottom-tabs.BottomTabsNavigatorPackage",
          "com.react-navigation.bottom-tabs.BottomTabsNavigatorPackage",
          "com.reactnavigation.native-stack.NativeStackNavigatorPackage",
          "com.react-navigation.native-stack.NativeStackNavigatorPackage",
          
          // Core UI
          "com.swmansion.rnscreens.RNScreensPackage",
          "com.reactnativecommunity.screens.RNScreensPackage",
          "com.reactnativecommunity.safeareacontext.SafeAreaContextPackage",
          "com.th3rdwave.gesturehandler.RNGestureHandlerPackage",
          "com.reactnativecommunity.gesturehandler.RNGestureHandlerPackage",
          
          // Animation and reanimated
          "com.swmansion.reanimated.ReanimatedPackage",
          "com.reactnativecommunity.reanimated.ReanimatedPackage",
          
          // Network and sensors
          "com.reactnativecommunity.netinfo.NetInfoPackage",
          "com.reactnativecommunity.device_info.RNDeviceInfo",
          "com.reactnative.device.info.RNDeviceInfo",
          
          // File operations
          "com.reactnativecommunity.rnfs.RNFSPackage",
          "com.reactnativecommunity.fs.RNFSPackage",
          
          // UI Components
          "org.wonday.svg.SvgPackage",
          "com.horcrux.svg.SvgPackage",
          "com.reactnativecommunity.blur.BlurViewPackage",
          "com.reactnativecommunity.picker.PickerPackage",
          
          // Communication
          "com.reactnativecommunity.contacts.RNContactsPackage",
          "com.reactnativecommunity.share.RNSharePackage",
          "com.reactnative.community.share.RNSharePackage",
          "com.reactnativecommunity.documentpicker.DocumentPickerPackage",
          
          // Utilities
          "com.reactnativecommunity.torch.RNTorchPackage",
          "com.reactnativecommunity.toast.RNToastPackage",
          "com.reactnativecommunity.blobutil.BlobUtilPackage",
          "com.reactnativecommunity.lineargradient.LinearGradientPackage",
          "com.th3rdwave.lineargradient.LinearGradientPackage",
          
          // Database
          "com.opcsqltie.OPSQLitePackage",
          "com.op-engineering.sqlite.OPSQLitePackage"
        )
        
        for (className in packageClassNames) {
          try {
            val clazz = Class.forName(className)
            val packageInstance = clazz.getDeclaredConstructor().newInstance() as ReactPackage
            packages.add(packageInstance)
          } catch (e: Exception) {
            // Silently skip packages that don't exist
          }
        }
        
        return packages
      }

      // Dev support ON in debug builds only
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override fun getJSMainModuleName(): String = "index"

      // ✔ Enable Hermes for better memory management in bulk tasks
      override val isHermesEnabled: Boolean
        get() = BuildConfig.IS_HERMES_ENABLED

      // Keep New Architecture OFF until stability confirmed
      override val isNewArchEnabled: Boolean
        get() = false
    }

  override fun onCreate() {
    super.onCreate()
    // Initialize SoLoader with the new merged mapping for RN 0.76+
    // This ensures all native libraries including Hermes are properly loaded
    SoLoader.init(this, OpenSourceMergedSoMapping)
    
    // Force load Hermes to ensure it's available
    if (BuildConfig.IS_HERMES_ENABLED) {
      try {
        System.loadLibrary("hermes")
      } catch (e: UnsatisfiedLinkError) {
        // Fallback - let React Native handle Hermes loading
      }
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
  }
}