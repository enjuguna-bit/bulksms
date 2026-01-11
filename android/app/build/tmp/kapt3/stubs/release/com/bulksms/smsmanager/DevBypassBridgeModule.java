package com.bulksms.smsmanager;

/**
 * ✅ DevBypassBridgeModule
 * ------------------------------------------------------------
 * Exposes developer bypass or trial unlock info to JavaScript.
 * Reads flags like DEV_BYPASS and EXPO_PUBLIC_DEVELOPER_BYPASS.
 * Used by BillingProvider / PaywallScreen for developer testing.
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000&\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0010\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0007J\b\u0010\t\u001a\u00020\nH\u0016J\u0010\u0010\u000b\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0007R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\f"}, d2 = {"Lcom/bulksms/smsmanager/DevBypassBridgeModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "ctx", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "getBypassInfo", "", "promise", "Lcom/facebook/react/bridge/Promise;", "getName", "", "isDevBypassEnabled", "app_release"})
public final class DevBypassBridgeModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext ctx = null;
    
    public DevBypassBridgeModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext ctx) {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void isDevBypassEnabled(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getBypassInfo(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
}