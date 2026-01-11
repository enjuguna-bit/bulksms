package com.bulksms.smsmanager;

/**
 * ✅ DefaultSmsRoleModule
 * ------------------------------------------------------------
 * Handles Android default-SMS role request with full result handling.
 * Works across Android 5.0 – 14.
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000@\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0005\u0018\u0000 \u00182\u00020\u00012\u00020\u0002:\u0001\u0018B\r\u0012\u0006\u0010\u0003\u001a\u00020\u0004\u00a2\u0006\u0002\u0010\u0005J\b\u0010\b\u001a\u00020\tH\u0016J\u0010\u0010\n\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\u0007H\u0007J,\u0010\r\u001a\u00020\u000b2\b\u0010\u000e\u001a\u0004\u0018\u00010\u000f2\u0006\u0010\u0010\u001a\u00020\u00112\u0006\u0010\u0012\u001a\u00020\u00112\b\u0010\u0013\u001a\u0004\u0018\u00010\u0014H\u0016J\u0012\u0010\u0015\u001a\u00020\u000b2\b\u0010\u0016\u001a\u0004\u0018\u00010\u0014H\u0016J\u0010\u0010\u0017\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\u0007H\u0007R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0006\u001a\u0004\u0018\u00010\u0007X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0019"}, d2 = {"Lcom/bulksms/smsmanager/DefaultSmsRoleModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "Lcom/facebook/react/bridge/ActivityEventListener;", "ctx", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "rolePromise", "Lcom/facebook/react/bridge/Promise;", "getName", "", "isDefaultSmsApp", "", "promise", "onActivityResult", "activity", "Landroid/app/Activity;", "requestCode", "", "resultCode", "data", "Landroid/content/Intent;", "onNewIntent", "intent", "requestDefaultSmsApp", "Companion", "app_release"})
public final class DefaultSmsRoleModule extends com.facebook.react.bridge.ReactContextBaseJavaModule implements com.facebook.react.bridge.ActivityEventListener {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext ctx = null;
    @org.jetbrains.annotations.Nullable()
    private com.facebook.react.bridge.Promise rolePromise;
    private static final int REQUEST_CODE_SET_DEFAULT_SMS = 1001;
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.DefaultSmsRoleModule.Companion Companion = null;
    
    public DefaultSmsRoleModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext ctx) {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void isDefaultSmsApp(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void requestDefaultSmsApp(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @java.lang.Override()
    public void onActivityResult(@org.jetbrains.annotations.Nullable()
    android.app.Activity activity, int requestCode, int resultCode, @org.jetbrains.annotations.Nullable()
    android.content.Intent data) {
    }
    
    @java.lang.Override()
    public void onNewIntent(@org.jetbrains.annotations.Nullable()
    android.content.Intent intent) {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0012\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\b\n\u0000\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0005"}, d2 = {"Lcom/bulksms/smsmanager/DefaultSmsRoleModule$Companion;", "", "()V", "REQUEST_CODE_SET_DEFAULT_SMS", "", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}