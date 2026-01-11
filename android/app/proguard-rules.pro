# React Native Standard Rules
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

# Do not strip any method/class that is invoked from JavaScript (NativeModules)
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    <init>(...);
}

# Keep our custom Native Modules
-keep class com.bulksms.smsmanager.** { *; }

# OkHttp (used by Networking)
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# SQLite
-keep class org.pgsqlite.** { *; }

# op-sqlite ProGuard Rules (Critical for release builds)
-keep class com.opengineering.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Keep native methods and JNI classes
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep SQLite native library classes
-keep class com.opengineering.op_sqlite.** { *; }

# Prevent obfuscation of JSI and native interfaces
-keep class com.facebook.react.turbomodule.core.** { *; }
-keep class com.facebook.jni.HybridData { *; }
-keep class com.facebook.jni.HybridData$Destructor { *; }

# Keep SQLite database classes
-dontwarn java.lang.invoke.**
-dontwarn com.facebook.react.turbomodule.core.**
-dontwarn com.opengineering.op_sqlite.**

# PDFBox library keep rules (fixes R8 compilation errors)
-dontwarn com.gemalto.jp2.JP2Decoder
-keep class com.tom_roush.pdfbox.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbo.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# If you use React Native Screens (likely used by your navigation)
-keep class com.swmansion.rnscreens.** { *; }