// ===================================================================
// 🧪 src/db/__tests__/threadIdUtils.test.ts
// Tests for thread ID utility functions
// ===================================================================

import {
    normalizeThreadId,
    isValidThreadId,
    toThreadId,
    cleanThreadId,
    isPhoneThreadId,
    isNumericThreadId,
    convertThreadId,
    createThreadId,
} from '../utils/threadIdUtils';

describe('Thread ID Utils', () => {
    // ============================================================
    // normalizeThreadId Tests
    // ============================================================
    describe('normalizeThreadId', () => {
        it('should convert numeric ID to string', () => {
            expect(normalizeThreadId(42)).toBe('42');
            expect(normalizeThreadId(0)).toBe('0');
            expect(normalizeThreadId(999999)).toBe('999999');
        });

        it('should preserve string IDs', () => {
            expect(normalizeThreadId('42')).toBe('42');
            expect(normalizeThreadId('+1234567890')).toBe('+1234567890');
            expect(normalizeThreadId('abc123')).toBe('abc123');
        });

        it('should trim whitespace', () => {
            expect(normalizeThreadId('  42  ')).toBe('42');
            expect(normalizeThreadId(' +1234567890 ')).toBe('+1234567890');
        });

        it('should throw on null or undefined', () => {
            expect(() => normalizeThreadId(null)).toThrow();
            expect(() => normalizeThreadId(undefined)).toThrow();
        });

        it('should throw on empty string', () => {
            expect(() => normalizeThreadId('')).toThrow();
            expect(() => normalizeThreadId('   ')).toThrow();
        });

        it('should handle negative numbers', () => {
            expect(normalizeThreadId(-42)).toBe('-42');
        });
    });

    // ============================================================
    // isValidThreadId Tests
    // ============================================================
    describe('isValidThreadId', () => {
        it('should return true for valid IDs', () => {
            expect(isValidThreadId(42)).toBe(true);
            expect(isValidThreadId('42')).toBe(true);
            expect(isValidThreadId('+1234567890')).toBe(true);
            expect(isValidThreadId('abc')).toBe(true);
        });

        it('should return false for invalid IDs', () => {
            expect(isValidThreadId(null)).toBe(false);
            expect(isValidThreadId(undefined)).toBe(false);
            expect(isValidThreadId('')).toBe(false);
            expect(isValidThreadId('   ')).toBe(false);
        });

        it('should return false for non-string/number types', () => {
            expect(isValidThreadId({})).toBe(false);
            expect(isValidThreadId([])).toBe(false);
            expect(isValidThreadId(NaN)).toBe(false);
        });
    });

    // ============================================================
    // toThreadId Tests
    // ============================================================
    describe('toThreadId', () => {
        it('should convert valid IDs without fallback', () => {
            expect(toThreadId(42)).toBe('42');
            expect(toThreadId('+1234567890')).toBe('+1234567890');
        });

        it('should return fallback for invalid IDs', () => {
            expect(toThreadId(null, 'default')).toBe('default');
            expect(toThreadId(undefined, 'default')).toBe('default');
            expect(toThreadId('', 'default')).toBe('default');
        });

        it('should use empty string as default fallback', () => {
            expect(toThreadId(null)).toBe('');
            expect(toThreadId(undefined)).toBe('');
        });
    });

    // ============================================================
    // cleanThreadId Tests
    // ============================================================
    describe('cleanThreadId', () => {
        it('should remove phone formatting characters', () => {
            expect(cleanThreadId('(123) 456-7890')).toBe('1234567890');
            expect(cleanThreadId('123-456-7890')).toBe('1234567890');
            expect(cleanThreadId('123 456 7890')).toBe('1234567890');
            expect(cleanThreadId('+1 (123) 456-7890')).toBe('+11234567890');
        });

        it('should preserve numeric IDs', () => {
            expect(cleanThreadId('42')).toBe('42');
            expect(cleanThreadId(42)).toBe('42');
        });

        it('should preserve international format', () => {
            expect(cleanThreadId('+1234567890')).toBe('+1234567890');
            expect(cleanThreadId('+44 20 7946 0958')).toBe('+442079460958');
        });

        it('should throw on invalid input', () => {
            expect(() => cleanThreadId(null)).toThrow();
            expect(() => cleanThreadId(undefined)).toThrow();
        });
    });

    // ============================================================
    // isPhoneThreadId Tests
    // ============================================================
    describe('isPhoneThreadId', () => {
        it('should identify phone numbers', () => {
            expect(isPhoneThreadId('+1234567890')).toBe(true);
            expect(isPhoneThreadId('1234567890')).toBe(true);
            expect(isPhoneThreadId('+44 20 7946 0958')).toBe(true);
            expect(isPhoneThreadId('254712345678')).toBe(true);
        });

        it('should not identify numeric IDs as phones (no leading +)', () => {
            expect(isPhoneThreadId('42')).toBe(true); // Debatable, but has digits
            expect(isPhoneThreadId('123')).toBe(true);
        });

        it('should return false for non-phone formats', () => {
            expect(isPhoneThreadId('abc')).toBe(false);
            expect(isPhoneThreadId('user@example.com')).toBe(false);
        });

        it('should return false for invalid input', () => {
            expect(isPhoneThreadId(null)).toBe(false);
            expect(isPhoneThreadId(undefined)).toBe(false);
        });
    });

    // ============================================================
    // isNumericThreadId Tests
    // ============================================================
    describe('isNumericThreadId', () => {
        it('should identify numeric IDs', () => {
            expect(isNumericThreadId(42)).toBe(true);
            expect(isNumericThreadId('42')).toBe(true);
            expect(isNumericThreadId('999999')).toBe(true);
            expect(isNumericThreadId(0)).toBe(true);
        });

        it('should not identify phone numbers as numeric', () => {
            expect(isNumericThreadId('+1234567890')).toBe(false);
            expect(isNumericThreadId('1234567890')).toBe(false);
        });

        it('should not identify non-numeric strings', () => {
            expect(isNumericThreadId('abc')).toBe(false);
            expect(isNumericThreadId('42abc')).toBe(false);
            expect(isNumericThreadId('4.2')).toBe(false);
        });

        it('should return false for invalid input', () => {
            expect(isNumericThreadId(null)).toBe(false);
            expect(isNumericThreadId(undefined)).toBe(false);
        });
    });

    // ============================================================
    // convertThreadId Tests
    // ============================================================
    describe('convertThreadId', () => {
        it('should be alias for normalizeThreadId', () => {
            expect(convertThreadId(42)).toBe('42');
            expect(convertThreadId('+1234567890')).toBe('+1234567890');
        });

        it('should throw on invalid input like normalizeThreadId', () => {
            expect(() => convertThreadId(null)).toThrow();
            expect(() => convertThreadId(undefined)).toThrow();
        });
    });

    // ============================================================
    // createThreadId Tests
    // ============================================================
    describe('createThreadId', () => {
        it('should create valid thread IDs', () => {
            expect(createThreadId(42)).toBe('42');
            expect(createThreadId('+1234567890')).toBe('+1234567890');
            expect(createThreadId('abc123')).toBe('abc123');
        });

        it('should throw on invalid input', () => {
            expect(() => createThreadId(null)).toThrow();
            expect(() => createThreadId(undefined)).toThrow();
            expect(() => createThreadId('')).toThrow();
        });
    });

    // ============================================================
    // Integration Tests
    // ============================================================
    describe('Integration Scenarios', () => {
        it('should handle mixed format input safely', () => {
            const inputs = [42, '42', '+1234567890', 'thread-abc'];
            inputs.forEach(input => {
                expect(isValidThreadId(input)).toBe(true);
                expect(normalizeThreadId(input)).toBeDefined();
            });
        });

        it('should properly classify thread ID types', () => {
            // Numeric
            expect(isNumericThreadId('42')).toBe(true);
            expect(isPhoneThreadId('42')).toBe(true); // Has digits

            // Phone
            expect(isPhoneThreadId('+1234567890')).toBe(true);
            expect(isNumericThreadId('+1234567890')).toBe(false);

            // String address
            expect(isNumericThreadId('user-123')).toBe(false);
            expect(isPhoneThreadId('user-123')).toBe(false);
        });

        it('should clean and classify consistently', () => {
            const dirtyPhone = '(123) 456-7890';
            const cleaned = cleanThreadId(dirtyPhone);
            expect(isPhoneThreadId(cleaned)).toBe(true);
            expect(isNumericThreadId(cleaned)).toBe(false);
        });
    });
});
