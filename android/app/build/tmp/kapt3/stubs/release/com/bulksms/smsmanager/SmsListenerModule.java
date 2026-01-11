package com.bulksms.smsmanager;

/**
 * ✅ SmsListenerModule
 * ------------------------------------------------------------
 * Emits "onSmsReceived" events to JavaScript:
 * { phone: string, body: string, timestamp: number }
 * ------------------------------------------------------------
 * Acts as a bridge between the native SmsReceiver and the JS layer.
 * internal BroadcastReceiver has been removed in favor of the
 * manifest-registered SmsReceiver to avoid duplicates.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000(\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0005\n\u0002\u0010\b\n\u0002\b\u0002\u0018\u0000 \u000f2\u00020\u0001:\u0001\u000fB\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0010\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0007J\b\u0010\t\u001a\u00020\bH\u0016J\b\u0010\n\u001a\u00020\u0006H\u0016J\b\u0010\u000b\u001a\u00020\u0006H\u0016J\u0010\u0010\f\u001a\u00020\u00062\u0006\u0010\r\u001a\u00020\u000eH\u0007R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0010"}, d2 = {"Lcom/bulksms/smsmanager/SmsListenerModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "ctx", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "addListener", "", "eventName", "", "getName", "initialize", "onCatalystInstanceDestroy", "removeListeners", "count", "", "Companion", "app_release"})
public final class SmsListenerModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext ctx = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "SmsListenerModule";
    @org.jetbrains.annotations.Nullable()
    private static java.lang.ref.WeakReference<com.facebook.react.bridge.ReactApplicationContext> reactContextRef;
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.SmsListenerModule.Companion Companion = null;
    
    public SmsListenerModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext ctx) {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    @java.lang.Override()
    public void initialize() {
    }
    
    @java.lang.Override()
    public void onCatalystInstanceDestroy() {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void addListener(@org.jetbrains.annotations.NotNull()
    java.lang.String eventName) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void removeListeners(int count) {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000,\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0002\b\u0003\n\u0002\u0010\t\n\u0002\b\u0004\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u001e\u0010\b\u001a\u00020\t2\u0006\u0010\n\u001a\u00020\u00042\u0006\u0010\u000b\u001a\u00020\u00042\u0006\u0010\f\u001a\u00020\rJ\u001e\u0010\u000e\u001a\u00020\t2\u0006\u0010\n\u001a\u00020\u00042\u0006\u0010\u000f\u001a\u00020\u00042\u0006\u0010\u0010\u001a\u00020\u0004R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u0016\u0010\u0005\u001a\n\u0012\u0004\u0012\u00020\u0007\u0018\u00010\u0006X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0011"}, d2 = {"Lcom/bulksms/smsmanager/SmsListenerModule$Companion;", "", "()V", "TAG", "", "reactContextRef", "Ljava/lang/ref/WeakReference;", "Lcom/facebook/react/bridge/ReactApplicationContext;", "sendEventToJs", "", "sender", "body", "timestamp", "", "sendKeywordEventToJs", "keyword", "action", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        /**
         * Static method to send SMS events from SmsReceiver or other native components.
         */
        public final void sendEventToJs(@org.jetbrains.annotations.NotNull()
        java.lang.String sender, @org.jetbrains.annotations.NotNull()
        java.lang.String body, long timestamp) {
        }
        
        /**
         * ✅ Static method to send keyword events from SmsReceiver.
         * Emits "onSmsKeyword" event: { phone: string, keyword: string, action: string }
         *
         * @param sender The phone number that sent the keyword
         * @param keyword The detected keyword (BAL, STOP, INFO, HELP)
         * @param action The action type (balance_request, opt_out, info_request, help_request)
         */
        public final void sendKeywordEventToJs(@org.jetbrains.annotations.NotNull()
        java.lang.String sender, @org.jetbrains.annotations.NotNull()
        java.lang.String keyword, @org.jetbrains.annotations.NotNull()
        java.lang.String action) {
        }
    }
}