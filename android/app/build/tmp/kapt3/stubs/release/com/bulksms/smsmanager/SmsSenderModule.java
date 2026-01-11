package com.bulksms.smsmanager;

/**
 * ✅ SmsSenderModule — Native SMS Bridge (Corrected)
 * ------------------------------------------------------------
 * • Sends SMS with sent + delivery tracking
 * • Supports dual-SIM devices
 * • Uses AtomicInteger for unique PendingIntent request codes
 * • ⚡ FIX: Added BroadcastReceiver to bridge events to JS
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000H\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0004\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\b\n\u0002\b\f\u0018\u0000 \"2\u00020\u0001:\u0002\"#B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0010\u0010\u000b\u001a\u00020\f2\u0006\u0010\r\u001a\u00020\u000eH\u0007J\u0010\u0010\u000f\u001a\u00020\f2\u0006\u0010\u0010\u001a\u00020\u0011H\u0007J\b\u0010\u0012\u001a\u00020\u000eH\u0016J\u0010\u0010\u0013\u001a\u00020\f2\u0006\u0010\u0010\u001a\u00020\u0011H\u0007J\u0010\u0010\u0014\u001a\u00020\f2\u0006\u0010\u0010\u001a\u00020\u0011H\u0007J\u0010\u0010\u0015\u001a\u00020\u00162\u0006\u0010\u0017\u001a\u00020\u0018H\u0002J\u0010\u0010\u0019\u001a\u00020\f2\u0006\u0010\u0010\u001a\u00020\u0011H\u0007J\b\u0010\u001a\u001a\u00020\fH\u0016J\u0010\u0010\u001b\u001a\u00020\f2\u0006\u0010\u001c\u001a\u00020\u0018H\u0007J\b\u0010\u001d\u001a\u00020\fH\u0002J\u0018\u0010\u001e\u001a\u00020\f2\u0006\u0010\u001f\u001a\u00020\u000e2\u0006\u0010 \u001a\u00020\u000eH\u0002J(\u0010!\u001a\u00020\f2\u0006\u0010\u001f\u001a\u00020\u000e2\u0006\u0010 \u001a\u00020\u000e2\u0006\u0010\u0017\u001a\u00020\u00182\u0006\u0010\u0010\u001a\u00020\u0011H\u0007R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\t\u001a\u00020\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006$"}, d2 = {"Lcom/bulksms/smsmanager/SmsSenderModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "ctx", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "isReceiverRegistered", "", "requestCodeGenerator", "Ljava/util/concurrent/atomic/AtomicInteger;", "smsStatusReceiver", "Lcom/bulksms/smsmanager/SmsSenderModule$SmsBroadcastReceiver;", "addListener", "", "eventName", "", "canSendSms", "promise", "Lcom/facebook/react/bridge/Promise;", "getName", "getNetworkInfo", "getSimCount", "getSmsManager", "Landroid/telephony/SmsManager;", "simSlot", "", "isSafaricomNetwork", "onCatalystInstanceDestroy", "removeListeners", "count", "safeUnregisterReceiver", "saveSentMessage", "phoneNumber", "message", "sendSms", "Companion", "SmsBroadcastReceiver", "app_release"})
public final class SmsSenderModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext ctx = null;
    @org.jetbrains.annotations.NotNull()
    private final java.util.concurrent.atomic.AtomicInteger requestCodeGenerator = null;
    private boolean isReceiverRegistered = false;
    @org.jetbrains.annotations.NotNull()
    private final com.bulksms.smsmanager.SmsSenderModule.SmsBroadcastReceiver smsStatusReceiver = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "SmsSenderModule";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String SENT_ACTION = "com.bulksms.smsmanager.SMS_SENT";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String DELIVERED_ACTION = "com.bulksms.smsmanager.SMS_DELIVERED";
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.SmsSenderModule.Companion Companion = null;
    
    public SmsSenderModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext ctx) {
        super();
    }
    
    /**
     * ⚡ Safely unregister receiver to prevent memory leaks from accumulation.
     * Called both in init (for recreation scenarios) and onCatalystInstanceDestroy.
     */
    private final void safeUnregisterReceiver() {
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void addListener(@org.jetbrains.annotations.NotNull()
    java.lang.String eventName) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void removeListeners(int count) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void sendSms(@org.jetbrains.annotations.NotNull()
    java.lang.String phoneNumber, @org.jetbrains.annotations.NotNull()
    java.lang.String message, int simSlot, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * Safely retrieves the SmsManager.
     * Handles missing READ_PHONE_STATE permission by falling back to default.
     */
    private final android.telephony.SmsManager getSmsManager(int simSlot) {
        return null;
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getSimCount(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void canSendSms(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * 🇰🇪 Check if device is on Safaricom network (Kenya)
     * Uses MCC/MNC codes: 639 (Kenya) + 02/07 (Safaricom)
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void isSafaricomNetwork(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * 📶 Get network operator info (useful for debugging)
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void getNetworkInfo(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * 📥 Save sent message to Android SMS content provider
     * This makes sent messages appear in the device's SMS inbox/thread
     */
    private final void saveSentMessage(java.lang.String phoneNumber, java.lang.String message) {
    }
    
    /**
     * ⚡ Cleanup receiver when module is destroyed to prevent leaks
     */
    @java.lang.Override()
    public void onCatalystInstanceDestroy() {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0014\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0003\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0007"}, d2 = {"Lcom/bulksms/smsmanager/SmsSenderModule$Companion;", "", "()V", "DELIVERED_ACTION", "", "SENT_ACTION", "TAG", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
    
    /**
     * 📡 Receiver to handle system callbacks and forward them to JS.
     * Static nested class + WeakReference prevents memory leaks.
     */
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00008\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u000e\n\u0000\n\u0002\u0018\u0002\n\u0000\b\u0002\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0018\u0010\b\u001a\u00020\t2\u0006\u0010\u0002\u001a\u00020\n2\u0006\u0010\u000b\u001a\u00020\fH\u0016J \u0010\r\u001a\u00020\t2\u0006\u0010\u000e\u001a\u00020\u00032\u0006\u0010\u000f\u001a\u00020\u00102\u0006\u0010\u0011\u001a\u00020\u0012H\u0002R\u001c\u0010\u0005\u001a\u0010\u0012\f\u0012\n \u0007*\u0004\u0018\u00010\u00030\u00030\u0006X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0013"}, d2 = {"Lcom/bulksms/smsmanager/SmsSenderModule$SmsBroadcastReceiver;", "Landroid/content/BroadcastReceiver;", "context", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "contextRef", "Ljava/lang/ref/WeakReference;", "kotlin.jvm.PlatformType", "onReceive", "", "Landroid/content/Context;", "intent", "Landroid/content/Intent;", "sendEvent", "reactContext", "eventName", "", "params", "Lcom/facebook/react/bridge/WritableMap;", "app_release"})
    static final class SmsBroadcastReceiver extends android.content.BroadcastReceiver {
        @org.jetbrains.annotations.NotNull()
        private final java.lang.ref.WeakReference<com.facebook.react.bridge.ReactApplicationContext> contextRef = null;
        
        public SmsBroadcastReceiver(@org.jetbrains.annotations.NotNull()
        com.facebook.react.bridge.ReactApplicationContext context) {
            super();
        }
        
        @java.lang.Override()
        public void onReceive(@org.jetbrains.annotations.NotNull()
        android.content.Context context, @org.jetbrains.annotations.NotNull()
        android.content.Intent intent) {
        }
        
        private final void sendEvent(com.facebook.react.bridge.ReactApplicationContext reactContext, java.lang.String eventName, com.facebook.react.bridge.WritableMap params) {
        }
    }
}