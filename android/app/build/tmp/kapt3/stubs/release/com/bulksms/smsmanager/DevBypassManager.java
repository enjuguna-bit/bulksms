package com.bulksms.smsmanager;

/**
 * ============================================================
 * DevBypassManager — Production-safe & CLI-compatible
 * ------------------------------------------------------------
 * • Checks BuildConfig flags injected by dotenv.gradle
 * • Handles Boolean, String, missing, or mis-typed fields
 * • No Expo dependencies (only names preserved for compatibility)
 * • Zero crashes if fields do not exist
 * ============================================================
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000 \n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u000b\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\u0004H\u0002J\u000e\u0010\b\u001a\u00020\u00062\u0006\u0010\t\u001a\u00020\nR\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u000b"}, d2 = {"Lcom/bulksms/smsmanager/DevBypassManager;", "", "()V", "TAG", "", "getBooleanField", "", "name", "isBypassEnabled", "context", "Landroid/content/Context;", "app_release"})
public final class DevBypassManager {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "DevBypassManager";
    @org.jetbrains.annotations.NotNull()
    public static final com.bulksms.smsmanager.DevBypassManager INSTANCE = null;
    
    private DevBypassManager() {
        super();
    }
    
    /**
     * ------------------------------------------------------------
     * Returns TRUE if any bypass flag is enabled:
     *   • DEV_BYPASS=true
     *   • EXPO_PUBLIC_DEVELOPER_BYPASS=true
     *
     * These flags come from:
     *   - android/app/.env  (via dotenv.gradle)
     *   - BuildConfig fields
     *
     * Safe on all builds:
     *   • Debug
     *   • Release
     *   • Signed APK
     * ------------------------------------------------------------
     */
    public final boolean isBypassEnabled(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return false;
    }
    
    /**
     * ------------------------------------------------------------
     * Reads a boolean BuildConfig field gracefully.
     * Supports:
     *    Boolean
     *    String "true"/"false"
     *    Missing fields → SAFE default false
     * ------------------------------------------------------------
     */
    private final boolean getBooleanField(java.lang.String name) {
        return false;
    }
}