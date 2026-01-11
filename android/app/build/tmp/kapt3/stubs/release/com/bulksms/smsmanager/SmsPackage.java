package com.bulksms.smsmanager;

/**
 * ✅ SmsPackage
 * ------------------------------------------------------------
 * Registers all native SMS-related modules for React Native.
 * Works with RN 0.76+ (CLI build).
 *
 * Included modules:
 * - SmsReaderModule → Reads inbox & parses M-PESA messages
 * - SmsSenderModule → Sends SMS (single/multipart, dual-SIM)
 * - SmsListenerModule → Emits incoming SMS to JS
 * - RoleHelperModule → Checks default SMS handler role
 * - DefaultSmsRoleModule → Requests system default SMS role
 * - DevBypassBridgeModule → Exposes developer bypass flags
 * - BulkSmsSchedulerModule → WorkManager-based bulk SMS scheduling
 * - PdfParserModule → Parses password-protected M-Pesa PDF statements
 * - CallManagerModule → Handles phone calls with dual-SIM support
 * ------------------------------------------------------------
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\"\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\u0018\u00002\u00020\u0001B\u0005\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010\u0003\u001a\b\u0012\u0004\u0012\u00020\u00050\u00042\u0006\u0010\u0006\u001a\u00020\u0007H\u0016J\u001e\u0010\b\u001a\u0010\u0012\f\u0012\n\u0012\u0002\b\u0003\u0012\u0002\b\u00030\t0\u00042\u0006\u0010\u0006\u001a\u00020\u0007H\u0016\u00a8\u0006\n"}, d2 = {"Lcom/bulksms/smsmanager/SmsPackage;", "Lcom/facebook/react/ReactPackage;", "()V", "createNativeModules", "", "Lcom/facebook/react/bridge/NativeModule;", "reactContext", "Lcom/facebook/react/bridge/ReactApplicationContext;", "createViewManagers", "Lcom/facebook/react/uimanager/ViewManager;", "app_release"})
public final class SmsPackage implements com.facebook.react.ReactPackage {
    
    public SmsPackage() {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.util.List<com.facebook.react.bridge.NativeModule> createNativeModules(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext reactContext) {
        return null;
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.util.List<com.facebook.react.uimanager.ViewManager<?, ?>> createViewManagers(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext reactContext) {
        return null;
    }
}