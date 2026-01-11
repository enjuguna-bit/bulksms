package com.bulksms.smsmanager;

/**
 * ✅ RoleHelperModule
 * ------------------------------------------------------------
 * Native bridge to handle SMS role management on Android 5+.
 * - Checks if the app is the default SMS handler
 * - Opens the system dialog to request default SMS role
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00008\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\b\u0010\u0005\u001a\u00020\u0006H\u0016J\u0010\u0010\u0007\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nH\u0002J\b\u0010\u000b\u001a\u00020\fH\u0016J\u0010\u0010\r\u001a\u00020\u000e2\u0006\u0010\u000f\u001a\u00020\u0010H\u0007J\b\u0010\u0011\u001a\u00020\u000eH\u0007J\u0010\u0010\u0012\u001a\u00020\u000e2\u0006\u0010\u000f\u001a\u00020\u0010H\u0007R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0013"}, d2 = {"Lcom/bulksms/smsmanager/RoleHelperModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "reactContext", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "canOverrideExistingModule", "", "createSmsRoleIntent", "Landroid/content/Intent;", "context", "Landroid/content/Context;", "getName", "", "isDefaultSmsApp", "", "promise", "Lcom/facebook/react/bridge/Promise;", "openSmsRoleIntent", "requestDefaultSmsRole", "app_release"})
public final class RoleHelperModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext reactContext = null;
    
    public RoleHelperModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext reactContext) {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    @java.lang.Override()
    public boolean canOverrideExistingModule() {
        return false;
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void isDefaultSmsApp(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void openSmsRoleIntent() {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void requestDefaultSmsRole(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    private final android.content.Intent createSmsRoleIntent(android.content.Context context) {
        return null;
    }
}