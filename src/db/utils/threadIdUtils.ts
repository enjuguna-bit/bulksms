// ===================================================================
// 📁 src/db/utils/threadIdUtils.ts
// Thread ID utility functions for handling both numeric and string IDs
// ===================================================================

/**
 * Normalize a thread identifier to a string.
 * Handles both numeric (legacy) and string (phone number) formats.
 * 
 * @param threadId - The thread identifier (can be number, string, or undefined)
 * @returns Normalized string thread ID
 * @throws Error if threadId is invalid or empty
 */
export function normalizeThreadId(threadId: number | string | null | undefined): string {
    if (threadId === null || threadId === undefined) {
        console.warn("[normalizeThreadId] Received null/undefined threadId, returning empty string");
        return "";
    }

    const normalized = String(threadId).trim();

    if (!normalized) {
        console.warn("[normalizeThreadId] Received empty threadId after normalization");
        return "";
    }

    return normalized;
}

/**
 * Validate that a thread identifier is valid.
 * 
 * @param threadId - The thread identifier to validate
 * @returns True if valid, false otherwise
 */
export function isValidThreadId(threadId: any): boolean {
    if (typeof threadId === 'number' && isNaN(threadId)) return false;
    if (typeof threadId !== 'string' && typeof threadId !== 'number') return false;
    try {
        const normalized = String(threadId).trim();
        return normalized.length > 0;
    } catch {
        return false;
    }
}

/**
 * Coerce a thread ID to string, with optional fallback value.
 * Safe version that returns a fallback instead of throwing.
 * 
 * @param threadId - The thread identifier
 * @param fallback - Fallback value if threadId is invalid (default: empty string)
 * @returns String thread ID or fallback value
 */
export function toThreadId(threadId: number | string | null | undefined, fallback: string = ""): string {
    try {
        const normalized = normalizeThreadId(threadId);
        return normalized || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Extract the primary identifier from a thread ID.
 * For phone numbers, removes any formatting.
 * For numeric IDs, returns as string.
 * 
 * @param threadId - The thread identifier
 * @returns Cleaned identifier
 */
export function cleanThreadId(threadId: number | string | null | undefined): string {
    const normalized = normalizeThreadId(threadId);

    // If it looks like a phone number (contains + or digits with optional separators), clean it
    if (/^[\d\-\(\)\s+]+$/.test(normalized)) {
        // Remove common phone number formatting characters
        return normalized.replace(/[\s\-\(\)]/g, '');
    }

    return normalized;
}

/**
 * Determine if a thread ID represents a phone number.
 * 
 * @param threadId - The thread identifier
 * @returns True if threadId appears to be a phone number
 */
export function isPhoneThreadId(threadId: number | string | null | undefined): boolean {
    try {
        const normalized = normalizeThreadId(threadId);
        // Check if it's a phone number (contains digits, may contain +)
        return /^[\d\+]/.test(normalized) && /\d/.test(normalized);
    } catch {
        return false;
    }
}

/**
 * Determine if a thread ID is numeric.
 * 
 * @param threadId - The thread identifier
 * @returns True if threadId is a numeric ID
 */
export function isNumericThreadId(threadId: any): boolean {
    try {
        const normalized = normalizeThreadId(threadId);
        return /^\d+$/.test(normalized);
    } catch {
        return false;
    }
}

/**
 * Convert between thread ID formats if needed.
 * Currently a pass-through but can be extended for ID mapping.
 * 
 * @param threadId - The thread identifier to convert
 * @returns Converted thread ID
 */
export function convertThreadId(threadId: number | string | null | undefined): string {
    return normalizeThreadId(threadId);
}

/**
 * Create a type-safe thread ID from various sources.
 * Useful when you have mixed types coming from different sources.
 * 
 * @param threadId - The thread identifier
 * @returns Type-safe string thread ID
 */
export function createThreadId(threadId: number | string | null | undefined): string {
    return normalizeThreadId(threadId);
}
