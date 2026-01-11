package com.bulksms.smsmanager;

/**
 * ✅ BulkSmsSendingWorker — Production-Grade Bulk SMS Service
 * ------------------------------------------------------------
 * Android best practices implementation for bulk SMS sending:
 *
 * • WorkManager-based (survives process death, battery efficient)
 * • Android 14+ compliant with proper foreground service type
 * • Per-message delivery tracking with PendingIntent callbacks
 * • Configurable carrier-safe delays (1-3 seconds)
 * • Exponential backoff for retries
 * • Live notification progress updates
 * • Graceful cancellation support
 * • Structured concurrency with coroutines
 * • Events broadcast to React Native layer
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000n\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0000\n\u0002\u0010#\n\u0002\u0010\b\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0002\b\u0007\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u000b\n\u0002\u0010\u0011\n\u0000\n\u0002\u0010\t\n\u0002\b\t\u0018\u0000 ;2\u00020\u0001:\u0001;B\u0015\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u0012\u0006\u0010\u0004\u001a\u00020\u0005\u00a2\u0006\u0002\u0010\u0006J\b\u0010\u0013\u001a\u00020\u0014H\u0002J0\u0010\u0015\u001a\u00020\u00142\u0006\u0010\u0016\u001a\u00020\u000e2\u0006\u0010\u0017\u001a\u00020\u000e2\u0006\u0010\u0018\u001a\u00020\u000e2\u0006\u0010\u0019\u001a\u00020\u000e2\u0006\u0010\u001a\u001a\u00020\u000eH\u0002J\u0010\u0010\u001b\u001a\u00020\u001c2\u0006\u0010\u001d\u001a\u00020\u001cH\u0002J\u0018\u0010\u001e\u001a\u00020\u001f2\u0006\u0010\u0016\u001a\u00020\u000e2\u0006\u0010\u0017\u001a\u00020\u000eH\u0002J\b\u0010 \u001a\u00020\u0014H\u0002J\u000e\u0010!\u001a\u00020\"H\u0096@\u00a2\u0006\u0002\u0010#J\u0010\u0010$\u001a\u00020%2\u0006\u0010&\u001a\u00020\u000eH\u0002J\b\u0010\'\u001a\u00020\u000bH\u0002J\b\u0010(\u001a\u00020\u0014H\u0002J.\u0010)\u001a\u00020\u000b2\u0006\u0010*\u001a\u00020%2\u0006\u0010+\u001a\u00020\u001c2\u0006\u0010,\u001a\u00020\u001c2\u0006\u0010-\u001a\u00020\u000eH\u0082@\u00a2\u0006\u0002\u0010.J<\u0010/\u001a\u00020\u00142\f\u00100\u001a\b\u0012\u0004\u0012\u00020\u001c012\u0006\u0010,\u001a\u00020\u001c2\u0006\u0010&\u001a\u00020\u000e2\u0006\u00102\u001a\u0002032\u0006\u0010-\u001a\u00020\u000eH\u0082@\u00a2\u0006\u0002\u00104J\b\u00105\u001a\u00020\u0014H\u0002J&\u00106\u001a\u00020\u00142\u0006\u0010\u0016\u001a\u00020\u000e2\u0006\u0010\u0017\u001a\u00020\u000e2\u0006\u0010\u0018\u001a\u00020\u000eH\u0082@\u00a2\u0006\u0002\u00107J\u0016\u00108\u001a\u00020\u00142\u0006\u00109\u001a\u000203H\u0082@\u00a2\u0006\u0002\u0010:R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\t\u001a\u00020\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u000bX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0014\u0010\f\u001a\b\u0012\u0004\u0012\u00020\u000e0\rX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000f\u001a\u00020\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0010\u001a\u00020\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0011\u001a\u0004\u0018\u00010\u0012X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006<"}, d2 = {"Lcom/bulksms/smsmanager/BulkSmsSendingWorker;", "Landroidx/work/CoroutineWorker;", "appContext", "Landroid/content/Context;", "workerParams", "Landroidx/work/WorkerParameters;", "(Landroid/content/Context;Landroidx/work/WorkerParameters;)V", "deliveredCount", "Ljava/util/concurrent/atomic/AtomicInteger;", "failedCount", "isReceiverRegistered", "", "pendingDeliveryConfirmations", "", "", "requestCodeGenerator", "sentCount", "smsStatusReceiver", "Landroid/content/BroadcastReceiver;", "broadcastCompletion", "", "broadcastProgress", "current", "total", "progress", "sent", "failed", "cleanPhoneNumber", "", "phone", "createForegroundInfo", "Landroidx/work/ForegroundInfo;", "createNotificationChannel", "doWork", "Landroidx/work/ListenableWorker$Result;", "(Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getSmsManager", "Landroid/telephony/SmsManager;", "simSlot", "hasSmsPermission", "registerSmsStatusReceiver", "sendSmsWithRetry", "smsManager", "phoneNumber", "message", "maxRetries", "(Landroid/telephony/SmsManager;Ljava/lang/String;Ljava/lang/String;ILkotlin/coroutines/Continuation;)Ljava/lang/Object;", "sendToAllRecipients", "recipients", "", "delayMs", "", "([Ljava/lang/String;Ljava/lang/String;IJILkotlin/coroutines/Continuation;)Ljava/lang/Object;", "unregisterSmsStatusReceiver", "updateProgressNotification", "(IIILkotlin/coroutines/Continuation;)Ljava/lang/Object;", "waitForPendingDeliveryReports", "maxWaitMs", "(JLkotlin/coroutines/Continuation;)Ljava/lang/Object;", "Companion", "app_release"})
public final class BulkSmsSendingWorker extends androidx.work.CoroutineWorker {
    @org.jetbrains.annotations.NotNull()
    private final android.content.Context appContext = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "BulkSmsSendingWorker";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String SMS_SENT_ACTION = "com.bulksms.smsmanager.BULK_SMS_SENT";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String SMS_DELIVERED_ACTION = "com.bulksms.smsmanager.BULK_SMS_DELIVERED";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String PROGRESS_UPDATE_ACTION = "com.bulksms.smsmanager.BULK_SMS_PROGRESS";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String BULK_SEND_COMPLETE_ACTION = "com.bulksms.smsmanager.BULK_SMS_COMPLETE";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String NOTIFICATION_CHANNEL_ID = "bulk_sms_sending_channel";
    private static final int NOTIFICATION_ID = 2001;
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_RECIPIENTS = "recipients";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_MESSAGE = "message";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_SIM_SLOT = "sim_slot";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_DELAY_MS = "delay_ms";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_MAX_RETRIES = "max_retries";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_TOTAL_SENT = "total_sent";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_TOTAL_FAILED = "total_failed";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_TOTAL_DELIVERED = "total_delivered";
    private static final long DEFAULT_DELAY_MS = 1500L;
    private static final int DEFAULT_MAX_RETRIES = 3;
    private static final long MIN_DELAY_MS = 750L;
    private static final long MAX_DELAY_MS = 3000L;
    private static final long BASE_BACKOFF_MS = 2000L;
    @org.jetbrains.annotations.NotNull()
    private final java.util.concurrent.atomic.AtomicInteger requestCodeGenerator = null;
    @org.jetbrains.annotations.NotNull()
    private final java.util.concurrent.atomic.AtomicInteger sentCount = null;
    @org.jetbrains.annotations.NotNull()
    private final java.util.concurrent.atomic.AtomicInteger failedCount = null;
    @org.jetbrains.annotations.NotNull()
    private final java.util.concurrent.atomic.AtomicInteger deliveredCount = null;
    @org.jetbrains.annotations.NotNull()
    private final java.util.Set<java.lang.Integer> pendingDeliveryConfirmations = null;
    @org.jetbrains.annotations.Nullable()
    private android.content.BroadcastReceiver smsStatusReceiver;
    private boolean isReceiverRegistered = false;
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.BulkSmsSendingWorker.Companion Companion = null;
    
    public BulkSmsSendingWorker(@org.jetbrains.annotations.NotNull()
    android.content.Context appContext, @org.jetbrains.annotations.NotNull()
    androidx.work.WorkerParameters workerParams) {
        super(null, null);
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.Nullable()
    public java.lang.Object doWork(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super androidx.work.ListenableWorker.Result> $completion) {
        return null;
    }
    
    private final java.lang.Object sendToAllRecipients(java.lang.String[] recipients, java.lang.String message, int simSlot, long delayMs, int maxRetries, kotlin.coroutines.Continuation<? super kotlin.Unit> $completion) {
        return null;
    }
    
    private final java.lang.Object sendSmsWithRetry(android.telephony.SmsManager smsManager, java.lang.String phoneNumber, java.lang.String message, int maxRetries, kotlin.coroutines.Continuation<? super java.lang.Boolean> $completion) {
        return null;
    }
    
    private final void registerSmsStatusReceiver() {
    }
    
    private final void unregisterSmsStatusReceiver() {
    }
    
    private final java.lang.Object waitForPendingDeliveryReports(long maxWaitMs, kotlin.coroutines.Continuation<? super kotlin.Unit> $completion) {
        return null;
    }
    
    private final androidx.work.ForegroundInfo createForegroundInfo(int current, int total) {
        return null;
    }
    
    private final void createNotificationChannel() {
    }
    
    private final java.lang.Object updateProgressNotification(int current, int total, int progress, kotlin.coroutines.Continuation<? super kotlin.Unit> $completion) {
        return null;
    }
    
    private final void broadcastProgress(int current, int total, int progress, int sent, int failed) {
    }
    
    private final void broadcastCompletion() {
    }
    
    private final boolean hasSmsPermission() {
        return false;
    }
    
    private final android.telephony.SmsManager getSmsManager(int simSlot) {
        return null;
    }
    
    private final java.lang.String cleanPhoneNumber(java.lang.String phone) {
        return null;
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00000\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\t\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0011\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0011\n\u0002\b\u0006\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J?\u0010\u001a\u001a\u00020\u001b2\f\u0010\u001c\u001a\b\u0012\u0004\u0012\u00020\u00060\u001d2\u0006\u0010\u001e\u001a\u00020\u00062\b\b\u0002\u0010\u001f\u001a\u00020\t2\b\b\u0002\u0010 \u001a\u00020\u00042\b\b\u0002\u0010!\u001a\u00020\t\u00a2\u0006\u0002\u0010\"R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\tX\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000b\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\f\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\r\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000e\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000f\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0010\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0011\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0012\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0013\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0014\u001a\u00020\u0006X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0015\u001a\u00020\tX\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0016\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0017\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0018\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0019\u001a\u00020\u0006X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006#"}, d2 = {"Lcom/bulksms/smsmanager/BulkSmsSendingWorker$Companion;", "", "()V", "BASE_BACKOFF_MS", "", "BULK_SEND_COMPLETE_ACTION", "", "DEFAULT_DELAY_MS", "DEFAULT_MAX_RETRIES", "", "KEY_DELAY_MS", "KEY_MAX_RETRIES", "KEY_MESSAGE", "KEY_RECIPIENTS", "KEY_SIM_SLOT", "KEY_TOTAL_DELIVERED", "KEY_TOTAL_FAILED", "KEY_TOTAL_SENT", "MAX_DELAY_MS", "MIN_DELAY_MS", "NOTIFICATION_CHANNEL_ID", "NOTIFICATION_ID", "PROGRESS_UPDATE_ACTION", "SMS_DELIVERED_ACTION", "SMS_SENT_ACTION", "TAG", "buildWorkRequest", "Landroidx/work/OneTimeWorkRequest;", "recipients", "", "message", "simSlot", "delayMs", "maxRetries", "([Ljava/lang/String;Ljava/lang/String;IJI)Landroidx/work/OneTimeWorkRequest;", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        @org.jetbrains.annotations.NotNull()
        public final androidx.work.OneTimeWorkRequest buildWorkRequest(@org.jetbrains.annotations.NotNull()
        java.lang.String[] recipients, @org.jetbrains.annotations.NotNull()
        java.lang.String message, int simSlot, long delayMs, int maxRetries) {
            return null;
        }
    }
}