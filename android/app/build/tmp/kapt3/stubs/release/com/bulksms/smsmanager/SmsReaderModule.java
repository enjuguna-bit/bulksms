package com.bulksms.smsmanager;

/**
 * ✅ SmsReaderModule
 * ------------------------------------------------------------
 * Reads SMS messages (Inbox & Sent) from the device using Telephony provider.
 * - No external dependencies
 * - Play Protect compliant
 * - Works when app is the default SMS handler
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000F\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0006\n\u0002\u0010\u000e\n\u0002\b\b\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u0011\n\u0002\b\u0005\u0018\u0000 $2\u00020\u0001:\u0002$%B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\b\u0010\u0005\u001a\u00020\u0006H\u0016J\u0010\u0010\u0007\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nH\u0007J\u0018\u0010\u000b\u001a\u00020\b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J \u0010\u000e\u001a\u00020\b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J\u0010\u0010\u0010\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nH\u0007J\u0018\u0010\u0011\u001a\u00020\b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J \u0010\u0012\u001a\u00020\b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J\b\u0010\u0013\u001a\u00020\u0014H\u0016J \u0010\u0015\u001a\u00020\b2\u0006\u0010\u0016\u001a\u00020\u00142\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J(\u0010\u0017\u001a\u00020\b2\u0006\u0010\u0016\u001a\u00020\u00142\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J\u0010\u0010\u0018\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nH\u0007J \u0010\u0019\u001a\u00020\b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\nH\u0007J\u0010\u0010\u001a\u001a\u00020\u00062\u0006\u0010\u001b\u001a\u00020\u0014H\u0002J\u0012\u0010\u001c\u001a\u0004\u0018\u00010\u001d2\u0006\u0010\u001b\u001a\u00020\u0014H\u0002JI\u0010\u001e\u001a\u00020\b2\b\u0010\u001f\u001a\u0004\u0018\u00010\u00142\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000f\u001a\u00020\r2\u0006\u0010\t\u001a\u00020\n2\u0010\b\u0002\u0010 \u001a\n\u0012\u0004\u0012\u00020\u0014\u0018\u00010!2\u0006\u0010\"\u001a\u00020\u0006H\u0002\u00a2\u0006\u0002\u0010#\u00a8\u0006&"}, d2 = {"Lcom/bulksms/smsmanager/SmsReaderModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "reactContext", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "canOverrideExistingModule", "", "checkPermissions", "", "promise", "Lcom/facebook/react/bridge/Promise;", "getAll", "limit", "", "getAllPaginated", "offset", "getMessageCount", "getMpesaMessages", "getMpesaMessagesPaginated", "getName", "", "getThreadByAddress", "address", "getThreadByAddressPaginated", "importExistingMessages", "importExistingMessagesPaginated", "isMpesaKeyword", "body", "parseMpesaMessage", "Lcom/bulksms/smsmanager/SmsReaderModule$MpesaMessage;", "queryMessages", "selection", "selectionArgs", "", "parseMpesa", "(Ljava/lang/String;IILcom/facebook/react/bridge/Promise;[Ljava/lang/String;Z)V", "Companion", "MpesaMessage", "app_release"})
public final class SmsReaderModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "SmsReaderModule";
    private static final int DEFAULT_PAGE_SIZE = 500;
    private static final int MAX_PAGE_SIZE = 10000;
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.SmsReaderModule.Companion Companion = null;
    
    public SmsReaderModule(@org.jetbrains.annotations.NotNull()
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
    public final void checkPermissions(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getAll(int limit, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getAllPaginated(int limit, int offset, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getThreadByAddress(@org.jetbrains.annotations.NotNull()
    java.lang.String address, int limit, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getThreadByAddressPaginated(@org.jetbrains.annotations.NotNull()
    java.lang.String address, int limit, int offset, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getMpesaMessages(int limit, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getMpesaMessagesPaginated(int limit, int offset, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    private final void queryMessages(java.lang.String selection, int limit, int offset, com.facebook.react.bridge.Promise promise, java.lang.String[] selectionArgs, boolean parseMpesa) {
    }
    
    private final boolean isMpesaKeyword(java.lang.String body) {
        return false;
    }
    
    private final com.bulksms.smsmanager.SmsReaderModule.MpesaMessage parseMpesaMessage(java.lang.String body) {
        return null;
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void getMessageCount(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void importExistingMessages(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @com.facebook.react.bridge.ReactMethod()
    public final void importExistingMessagesPaginated(int limit, int offset, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u001a\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0007X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\b"}, d2 = {"Lcom/bulksms/smsmanager/SmsReaderModule$Companion;", "", "()V", "DEFAULT_PAGE_SIZE", "", "MAX_PAGE_SIZE", "TAG", "", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\"\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0015\n\u0002\u0010\u000b\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0002\b\u0086\b\u0018\u00002\u00020\u0001B5\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u0012\u0006\u0010\u0004\u001a\u00020\u0003\u0012\u0006\u0010\u0005\u001a\u00020\u0003\u0012\u0006\u0010\u0006\u001a\u00020\u0003\u0012\u0006\u0010\u0007\u001a\u00020\u0003\u0012\u0006\u0010\b\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\tJ\t\u0010\u0011\u001a\u00020\u0003H\u00c6\u0003J\t\u0010\u0012\u001a\u00020\u0003H\u00c6\u0003J\t\u0010\u0013\u001a\u00020\u0003H\u00c6\u0003J\t\u0010\u0014\u001a\u00020\u0003H\u00c6\u0003J\t\u0010\u0015\u001a\u00020\u0003H\u00c6\u0003J\t\u0010\u0016\u001a\u00020\u0003H\u00c6\u0003JE\u0010\u0017\u001a\u00020\u00002\b\b\u0002\u0010\u0002\u001a\u00020\u00032\b\b\u0002\u0010\u0004\u001a\u00020\u00032\b\b\u0002\u0010\u0005\u001a\u00020\u00032\b\b\u0002\u0010\u0006\u001a\u00020\u00032\b\b\u0002\u0010\u0007\u001a\u00020\u00032\b\b\u0002\u0010\b\u001a\u00020\u0003H\u00c6\u0001J\u0013\u0010\u0018\u001a\u00020\u00192\b\u0010\u001a\u001a\u0004\u0018\u00010\u0001H\u00d6\u0003J\t\u0010\u001b\u001a\u00020\u001cH\u00d6\u0001J\t\u0010\u001d\u001a\u00020\u0003H\u00d6\u0001R\u0011\u0010\u0004\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\n\u0010\u000bR\u0011\u0010\b\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\f\u0010\u000bR\u0011\u0010\u0005\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\r\u0010\u000bR\u0011\u0010\u0006\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000e\u0010\u000bR\u0011\u0010\u0007\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000f\u0010\u000bR\u0011\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0010\u0010\u000b\u00a8\u0006\u001e"}, d2 = {"Lcom/bulksms/smsmanager/SmsReaderModule$MpesaMessage;", "", "transactionCode", "", "amount", "payer", "phoneNumber", "reference", "messageType", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", "getAmount", "()Ljava/lang/String;", "getMessageType", "getPayer", "getPhoneNumber", "getReference", "getTransactionCode", "component1", "component2", "component3", "component4", "component5", "component6", "copy", "equals", "", "other", "hashCode", "", "toString", "app_release"})
    public static final class MpesaMessage {
        @org.jetbrains.annotations.NotNull()
        private final java.lang.String transactionCode = null;
        @org.jetbrains.annotations.NotNull()
        private final java.lang.String amount = null;
        @org.jetbrains.annotations.NotNull()
        private final java.lang.String payer = null;
        @org.jetbrains.annotations.NotNull()
        private final java.lang.String phoneNumber = null;
        @org.jetbrains.annotations.NotNull()
        private final java.lang.String reference = null;
        @org.jetbrains.annotations.NotNull()
        private final java.lang.String messageType = null;
        
        public MpesaMessage(@org.jetbrains.annotations.NotNull()
        java.lang.String transactionCode, @org.jetbrains.annotations.NotNull()
        java.lang.String amount, @org.jetbrains.annotations.NotNull()
        java.lang.String payer, @org.jetbrains.annotations.NotNull()
        java.lang.String phoneNumber, @org.jetbrains.annotations.NotNull()
        java.lang.String reference, @org.jetbrains.annotations.NotNull()
        java.lang.String messageType) {
            super();
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getTransactionCode() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getAmount() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getPayer() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getPhoneNumber() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getReference() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getMessageType() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String component1() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String component2() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String component3() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String component4() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String component5() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String component6() {
            return null;
        }
        
        @org.jetbrains.annotations.NotNull()
        public final com.bulksms.smsmanager.SmsReaderModule.MpesaMessage copy(@org.jetbrains.annotations.NotNull()
        java.lang.String transactionCode, @org.jetbrains.annotations.NotNull()
        java.lang.String amount, @org.jetbrains.annotations.NotNull()
        java.lang.String payer, @org.jetbrains.annotations.NotNull()
        java.lang.String phoneNumber, @org.jetbrains.annotations.NotNull()
        java.lang.String reference, @org.jetbrains.annotations.NotNull()
        java.lang.String messageType) {
            return null;
        }
        
        @java.lang.Override()
        public boolean equals(@org.jetbrains.annotations.Nullable()
        java.lang.Object other) {
            return false;
        }
        
        @java.lang.Override()
        public int hashCode() {
            return 0;
        }
        
        @java.lang.Override()
        @org.jetbrains.annotations.NotNull()
        public java.lang.String toString() {
            return null;
        }
    }
}