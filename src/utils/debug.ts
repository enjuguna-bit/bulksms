export const DebugLogger = {
    enabled: __DEV__, // Enable only in development
    log: (tag: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(`🔍 [${tag}]`, ...args);
        }
    },
    warn: (tag: string, ...args: any[]) => {
        if (__DEV__) {
            console.warn(`⚠️ [${tag}]`, ...args);
        }
    },
    error: (tag: string, ...args: any[]) => {
        console.error(`❌ [${tag}]`, ...args);
    }
};
