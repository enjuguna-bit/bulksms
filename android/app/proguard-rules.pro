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