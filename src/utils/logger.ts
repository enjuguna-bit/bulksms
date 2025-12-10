/**
 * 📢 src/utils/logger.ts
 *
 * Centralized logging utility that ensures:
 * 1. Debug logs are stripped in production
 * 2. Errors are formatted consistently
 * 3. PII is not accidentally logged (by encouraging scope/message usage)
 * 4. Integration point for remote logging (Sentry/Crashlytics)
 */

const IS_DEV = __DEV__;

class Logger {
    /**
     * 🐛 DEBUG: Only visible in development.
     * Use for detailed variable inspection, flow tracing, etc.
     */
    static debug(scope: string, message: string, data?: unknown) {
        if (!IS_DEV) return;

        const prefix = `[${scope}] 🐛`;
        if (data !== undefined) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    /**
     * ℹ️ INFO: General operational events.
     * Visible in Dev. In Prod, can be used for "Checkpoints".
     */
    static info(scope: string, message: string, data?: unknown) {
        const prefix = `[${scope}] ℹ️`;

        if (IS_DEV) {
            if (data !== undefined) console.info(prefix, message, data);
            else console.info(prefix, message);
        } else {
            // In production, log vital info but be careful with data objects
            // We generally avoid logging complex objects in prod stdout to prevent PII leaks
            console.log(prefix, message);
        }
    }

    /**
     * ⚠️ WARN: Non-fatal issues that should be noted.
     */
    static warn(scope: string, message: string, data?: unknown) {
        const prefix = `[${scope}] ⚠️`;
        if (data !== undefined) console.warn(prefix, message, data);
        else console.warn(prefix, message);
    }

    /**
     * 🚨 ERROR: Fatal or critical failures.
     */
    static error(scope: string, message: string, error?: unknown) {
        const prefix = `[${scope}] 🚨`;
        if (error !== undefined) console.error(prefix, message, error);
        else console.error(prefix, message);
    }
}

export default Logger;
