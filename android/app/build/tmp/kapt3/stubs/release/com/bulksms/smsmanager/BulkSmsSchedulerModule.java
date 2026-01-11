package com.bulksms.smsmanager;

/**
 * ✅ BulkSmsSchedulerModule — React Native Bridge for Bulk SMS
 * ------------------------------------------------------------
 * Provides a clean API for scheduling, monitoring, and cancelling
 * bulk SMS jobs from the JavaScript layer.
 *
 * Features:
 * • Schedule bulk SMS via WorkManager
 * • Real-time progress events to JS
 * • Cancel running jobs
 * • Query job status
 * • Configurable delays and retry settings
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\\\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0007\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\u0018\u0000 %2\u00020\u0001:\u0001%B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0010\u0010\f\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\u000fH\u0007J\u0010\u0010\u0010\u001a\u00020\r2\u0006\u0010\u0011\u001a\u00020\u0012H\u0007J\u0010\u0010\u0013\u001a\u00020\r2\u0006\u0010\u0011\u001a\u00020\u0012H\u0007J\b\u0010\u0014\u001a\u00020\u000fH\u0016J\u0010\u0010\u0015\u001a\u00020\r2\u0006\u0010\u0011\u001a\u00020\u0012H\u0007J\b\u0010\u0016\u001a\u00020\rH\u0016J\b\u0010\u0017\u001a\u00020\rH\u0002J\u0010\u0010\u0018\u001a\u00020\r2\u0006\u0010\u0019\u001a\u00020\u001aH\u0007J*\u0010\u001b\u001a\u00020\r2\u0006\u0010\u001c\u001a\u00020\u001d2\u0006\u0010\u001e\u001a\u00020\u000f2\b\u0010\u001f\u001a\u0004\u0018\u00010 2\u0006\u0010\u0011\u001a\u00020\u0012H\u0007J\u0018\u0010!\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\u000f2\u0006\u0010\"\u001a\u00020#H\u0002J\b\u0010$\u001a\u00020\rH\u0002R\u0010\u0010\u0005\u001a\u0004\u0018\u00010\u0006X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\bX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\t\u001a\u0004\u0018\u00010\u0006X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\n\u001a\u0004\u0018\u00010\u000bX\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006&"}, d2 = {"Lcom/bulksms/smsmanager/BulkSmsSchedulerModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "ctx", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "completeReceiver", "Landroid/content/BroadcastReceiver;", "isReceiverRegistered", "", "progressReceiver", "workId", "Ljava/util/UUID;", "addListener", "", "eventName", "", "cancelBulkSend", "promise", "Lcom/facebook/react/bridge/Promise;", "getBulkSendStatus", "getName", "observeProgress", "onCatalystInstanceDestroy", "registerProgressReceivers", "removeListeners", "count", "", "scheduleBulkSend", "recipients", "Lcom/facebook/react/bridge/ReadableArray;", "message", "options", "Lcom/facebook/react/bridge/ReadableMap;", "sendEvent", "params", "Lcom/facebook/react/bridge/WritableMap;", "unregisterProgressReceivers", "Companion", "app_release"})
public final class BulkSmsSchedulerModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final com.facebook.react.bridge.ReactApplicationContext ctx = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "BulkSmsScheduler";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String EVENT_PROGRESS = "BulkSmsProgress";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String EVENT_COMPLETE = "BulkSmsComplete";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String EVENT_ERROR = "BulkSmsError";
    @org.jetbrains.annotations.Nullable()
    private java.util.UUID workId;
    @org.jetbrains.annotations.Nullable()
    private android.content.BroadcastReceiver progressReceiver;
    @org.jetbrains.annotations.Nullable()
    private android.content.BroadcastReceiver completeReceiver;
    private boolean isReceiverRegistered = false;
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.BulkSmsSchedulerModule.Companion Companion = null;
    
    public BulkSmsSchedulerModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext ctx) {
        super();
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
    
    /**
     * Schedule a bulk SMS sending job.
     *
     * @param recipients Array of phone numbers
     * @param message The message text
     * @param options Configuration options:
     *  - simSlot: SIM slot to use (0 or 1)
     *  - delayMs: Delay between messages in milliseconds (500-5000)
     *  - maxRetries: Maximum retry attempts per message (1-5)
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void scheduleBulkSend(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReadableArray recipients, @org.jetbrains.annotations.NotNull()
    java.lang.String message, @org.jetbrains.annotations.Nullable()
    com.facebook.react.bridge.ReadableMap options, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void cancelBulkSend(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getBulkSendStatus(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void observeProgress(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    private final void registerProgressReceivers() {
    }
    
    private final void unregisterProgressReceivers() {
    }
    
    private final void sendEvent(java.lang.String eventName, com.facebook.react.bridge.WritableMap params) {
    }
    
    @java.lang.Override()
    public void onCatalystInstanceDestroy() {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0014\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0004\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\b"}, d2 = {"Lcom/bulksms/smsmanager/BulkSmsSchedulerModule$Companion;", "", "()V", "EVENT_COMPLETE", "", "EVENT_ERROR", "EVENT_PROGRESS", "TAG", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}