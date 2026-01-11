package com.bulksms.smsmanager;

/**
 * 📞 CallManagerModule — Native Dual-SIM Call Handler
 * ---------------------------------------------------
 * • Makes phone calls with SIM selection support
 * • Gets available SIM information
 * • Handles CALL_PHONE permission requests
 * • Provides SIM selection UI for dual-SIM devices
 * ---------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0004\n\u0002\u0010\b\n\u0002\b\u0003\u0018\u0000 \u00122\u00020\u0001:\u0001\u0012B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0010\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0007J\u0010\u0010\t\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0007J\b\u0010\n\u001a\u00020\u000bH\u0016J\u0010\u0010\f\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0007J\'\u0010\r\u001a\u00020\u00062\u0006\u0010\u000e\u001a\u00020\u000b2\b\u0010\u000f\u001a\u0004\u0018\u00010\u00102\u0006\u0010\u0007\u001a\u00020\bH\u0007\u00a2\u0006\u0002\u0010\u0011R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0013"}, d2 = {"Lcom/bulksms/smsmanager/CallManagerModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "ctx", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "canMakeCalls", "", "promise", "Lcom/facebook/react/bridge/Promise;", "getAvailableSims", "getName", "", "hasMultipleSims", "makeCall", "phoneNumber", "subscriptionId", "", "(Ljava/lang/String;Ljava/lang/Integer;Lcom/facebook/react/bridge/Promise;)V", "Companion", "app_release"})
public final class CallManagerModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext ctx = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "CallManagerModule";
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.CallManagerModule.Companion Companion = null;
    
    public CallManagerModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext ctx) {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    /**
     * 📱 Get available SIM cards information
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void getAvailableSims(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * 📞 Make a call with optional SIM selection
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void makeCall(@org.jetbrains.annotations.NotNull()
    java.lang.String phoneNumber, @org.jetbrains.annotations.Nullable()
    java.lang.Integer subscriptionId, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * 🔍 Check if device has multiple SIMs
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void hasMultipleSims(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * 📋 Check if CALL_PHONE permission is granted
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void canMakeCalls(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0012\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0005"}, d2 = {"Lcom/bulksms/smsmanager/CallManagerModule$Companion;", "", "()V", "TAG", "", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}