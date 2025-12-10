// ---------------------------------------------------------
// ⚙️ src/constants/config.ts
// ✅ Global Configuration & Timeouts
// ---------------------------------------------------------

export const CONFIG = {
    // Database Names
    DB_MESSAGES: "messages.db",
    DB_TRANSACTIONS: "transactions.db",
    DB_SMS: "smsdb.db",

    // Timeouts & Delays
    SMS_SEND_TIMEOUT_MS: 10000,
    DEFAULT_RECHECK_DELAY_MS: 2000,
    POLL_INTERVAL_MS: 4000,

    // Limits
    MAX_STORED_MESSAGES: 200,
    DEFAULT_PAGE_SIZE: 50,
    PAYMENT_RECORD_MAX_AGE_MS: 14 * 24 * 60 * 60 * 1000, // 14 days

    // API
    PAYMENT_API_BASE_URL: "https://your-railway-app.up.railway.app",

    // Activation / Billing
    ACTIVATION_SERVER_URL: "https://cemes-activation-server.erick.cloud",
    MERCHANT_TILL: "3484366",
    DEFAULT_TRIAL_DURATION_MS: 2 * 24 * 60 * 60 * 1000, // 2 days

    // Keys
    ACTIVATION_PUBLIC_KEY_PEM: `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4SQgR4i8PqXMv8h7Ykz2
+vPO3zA5e1jwB2b9SQZy0IhQ4pYvpuZ1p57pQHS4YpD1pSMlnKzH/9Gj9v2XFQ0G
jJ7G2YzmFO9Qr1j6y8Qemj/1rGtUd8tZDW36E8QPAhlKpyvljzYJxJpZ4F8QG1dD
1c6ZkRDq6t/qh3Iu7gnAK/0aQ9jPSgd4x93ZyAraMiD1DU+mlppH5EQI2LgSd5Bn
+RM7G8BHSh9mGZqFYv76U5gHhVAb8U4CWPQu5K7duy4+7Q0jor6TRJp2cbLMxd9/
P+dmLemO8riAyONFv1q1oKoWYnVtQwD6MMCqk0SMlXZS2wIDAQAB
-----END PUBLIC KEY-----
`.trim(),

    // Developer
    IS_DEV_MODE: __DEV__,
    DEVELOPER_BYPASS: (__DEV__ === true) || String(process.env.DEVELOPER_BYPASS || process.env.REACT_NATIVE_DEVELOPER_BYPASS || '').trim().toLowerCase() === 'true',

    // Billing
    BILLING_PRODUCT_IDS: {
        monthly: "com.myapp.pro.monthly",
        quarterly: "com.myapp.pro.quarterly",
        yearly: "com.myapp.pro.yearly",
    },
    BILLING_DEFAULT_PRICES: {
        monthly: "$7.99",
        quarterly: "$24.99",
        yearly: "$94.99",
    },
};
