// ---------------------------------------------------------
// 📦 src/constants/storage.ts
// ✅ Centralized AsyncStorage & MMKV Keys
// ---------------------------------------------------------

export const STORAGE_KEYS = {
    // SMS Listener
    SMS_INCOMING_MPESA: "sms.incoming.mpesa",

    // Activation / Trial
    ACTIVATION_STATE: "activation_state",
    TRIAL_START_DATE: "trial_start_date",

    // Settings
    THEME_PREFERENCE: "theme_preference",

    // Onboarding
    HAS_COMPLETED_ONBOARDING: "has_completed_onboarding",

    // Payment Capture
    PAYMENT_LAST_SCAN: "last_scan_time",
    PAYMENT_RECORDS: "payment.capture.records",

    // Billing (Mock)
    BILLING_IS_PRO: "mock.isPro",
    BILLING_STATUS: "mock.status",
    BILLING_TRIAL_START: "mock.trialStartedAt",
    BILLING_TRIAL_END: "mock.trialEndsAt",
    BILLING_EXPIRY: "mock.expiryAt",
    BILLING_PRICES: "mock.prices",

    // Background
    PENDING_SMS_QUEUE: "@pending_sms_queue_v1",
};
