// ===================================================================
// 📁 src/db/utils/index.ts
// Central export point for all database utilities
// ===================================================================

// Thread ID utilities - Export all normalization and validation functions
export {
    normalizeThreadId,
    isValidThreadId,
    toThreadId,
    cleanThreadId,
    isPhoneThreadId,
    isNumericThreadId,
    convertThreadId,
    createThreadId,
} from './threadIdUtils';

export type {
    // Re-export any types if we add them in the future
};
