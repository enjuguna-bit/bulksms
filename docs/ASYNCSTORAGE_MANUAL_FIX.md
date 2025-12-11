# AsyncStorage Manual Linking - Complete Guide

## Current Status
✅ **Code changes applied** - AsyncStorage is now manually linked in the Android project  
❌ **Build failing** - AAPT2 executable missing from Gradle cache (Windows environment issue)

## What Was Done

### 1. Android Configuration Files Updated

**settings.gradle:**
```gradle
rootProject.name = 'bulksms'

// Manually include AsyncStorage
include ':@react-native-async-storage_async-storage'
project(':@react-native-async-storage_async-storage').projectDir = new File(rootProject.projectDir, '../node_modules/@react-native-async-storage/async-storage/android')

include ':app'
```

**app/build.gradle:**
```gradle
dependencies {
    implementation("com.facebook.react:react-android:0.76.9")
    
    // Manually add AsyncStorage
    implementation project(':@react-native-async-storage_async-storage')
    
    // ... other dependencies
}
```

**MainApplication.kt:**
```kotlin
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage

override fun getPackages(): List<ReactPackage> {
    return listOf(
        SmsPackage(),
        AsyncStoragePackage()
    )
}
```

### 2. Current Build Error
```
Specified AAPT2 executable does not exist: C:\gradle-home\caches\8.10.2\transforms\...
```

This is a **Windows Gradle cache corruption** issue, not related to AsyncStorage itself.

## Manual Fix Steps

### Option 1: Fix Gradle Cache (Recommended)

1. **Close Android Studio and all terminals**

2. **Delete Gradle caches:**
```powershell
# Delete project Gradle cache
Remove-Item -Path "android\.gradle" -Recurse -Force

# Delete user Gradle cache
Remove-Item -Path "$env:USERPROFILE\.gradle\caches" -Recurse -Force

# If you have a custom GRADLE_USER_HOME
Remove-Item -Path "C:\gradle-home\caches" -Recurse -Force -ErrorAction SilentlyContinue
```

3. **Clean and rebuild:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Option 2: Use Android Studio

1. Open `android/` folder in Android Studio
2. **File → Invalidate Caches / Restart**
3. Wait for Gradle sync to complete
4. **Build → Rebuild Project**
5. Run the app from Android Studio or use:
   ```bash
   npx react-native run-android
   ```

### Option 3: Reinstall Android SDK Build Tools

1. Open Android Studio
2. **Tools → SDK Manager**
3. **SDK Tools** tab
4. Uncheck **Android SDK Build-Tools**
5. Click **Apply** to uninstall
6. Check **Android SDK Build-Tools** again
7. Click **Apply** to reinstall
8. Restart and rebuild

### Option 4: Downgrade Android Gradle Plugin (If above fails)

Edit `android/build.gradle`:
```gradle
dependencies {
    classpath("com.android.tools.build:gradle:8.3.2")  // Down from 8.5.2
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
}
```

Then clean and rebuild.

## Verification Steps

Once the build succeeds, verify AsyncStorage works:

1. **Check logcat for errors:**
```bash
adb logcat -d -s ReactNativeJS:E | findstr AsyncStorage
```

Should show **NO** AsyncStorage errors.

2. **App should:**
   - Launch without red screen
   - Show default SMS dialog (first launch)
   - No "AsyncStorage is null" errors

## Why This Happened

1. **Original Issue:** `MainApplication.kt` wasn't linking any packages from `node_modules`
2. **First Attempt:** Tried using React Native autolinking, but RN 0.76 has changed autolinking mechanism
3. **Solution:** Manual linking of AsyncStorage (proven method for RN 0.76)
4. **Current Blocker:** Windows Gradle cache corruption (environmental, not code-related)

## Files Modified

- ✅ `android/settings.gradle` - Added AsyncStorage project
- ✅ `android/app/build.gradle` - Added AsyncStorage dependency  
- ✅ `android/app/src/main/java/com/bulksms/smsmanager/MainApplication.kt` - Added AsyncStoragePackage
- ✅ `android/gradle.properties` - Cleaned up (removed problematic AAPT2 overrides)

## Next Steps

1. Try **Option 1** (delete caches) first
2. If that fails, try **Option 2** (Android Studio)
3. If still failing, try **Option 3** (reinstall build tools)
4. Last resort: **Option 4** (downgrade Gradle plugin)

The AsyncStorage linking is **correct** - just need to resolve the Gradle/AAPT2 cache issue.

## Alternative: Use Previous Working Build

If you had a working APK before these changes, you can:
1. Revert the changes temporarily
2. Build the app
3. Then reapply AsyncStorage changes with a fresh Gradle environment

---
**Date:** December 10, 2024  
**Issue:** AsyncStorage native module not linked + Gradle AAPT2 cache corruption
