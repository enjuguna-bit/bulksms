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
import com.bulksms.smsmanager.SmsPackage
import java.lang.reflect.InvocationTargetException

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
        // Get all autolinked packages using reflection
        val packages = mutableListOf<ReactPackage>()
        
        try {
          // Try to load PackageList class using reflection
          val packageListClass = Class.forName("com.bulksms.smsmanager.PackageList")
          val constructor = packageListClass.getDeclaredConstructor(Application::class.java)
          val packageList = constructor.newInstance(this@MainApplication)
          
          // Call getPackages() on PackageList
          val getPackagesMethod = packageListClass.getDeclaredMethod("getPackages")
          @Suppress("UNCHECKED_CAST")
          val autolinkedPackages = getPackagesMethod.invoke(packageList) as List<ReactPackage>
          packages.addAll(autolinkedPackages)
        } catch (e: ClassNotFoundException) {
          // PackageList not generated, just add MainReactPackage
          packages.add(MainReactPackage())
        } catch (e: Exception) {
          // Handle other reflection errors
          e.printStackTrace()
          packages.add(MainReactPackage())
        }
        
        // Always add our custom SMS package
        packages.add(SmsPackage())
        
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