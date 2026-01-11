// ------------------------------------------------------
// 📘 src/utils/__tests__/phoneNormalizer.test.ts
// Tests for phone number normalization functionality
// ------------------------------------------------------

import { normalizePhoneNumber, normalizePhoneNumbers, isValidNormalizedPhone } from '../phoneNormalizer';

describe('Phone Number Normalization', () => {
  describe('normalizePhoneNumber', () => {
    test('should handle various Kenyan mobile number formats', () => {
      // Standard formats
      expect(normalizePhoneNumber('0712345678')).toBe('+254712345678');
      expect(normalizePhoneNumber('0722345678')).toBe('+254722345678');
      expect(normalizePhoneNumber('0112345678')).toBe('+254112345678');
      
      // Without leading zero
      expect(normalizePhoneNumber('712345678')).toBe('+254712345678');
      expect(normalizePhoneNumber('112345678')).toBe('+254112345678');
      
      // With country code
      expect(normalizePhoneNumber('+254712345678')).toBe('+254712345678');
      expect(normalizePhoneNumber('254712345678')).toBe('+254712345678');
      
      // Shorter numbers (should be padded)
      expect(normalizePhoneNumber('07123456')).toBe('+2547123456'); // 7 digits -> padded to 9
      expect(normalizePhoneNumber('7123456')).toBe('+2547123456');
    });

    test('should handle international numbers', () => {
      expect(normalizePhoneNumber('+1234567890')).toBe('+1234567890');
      expect(normalizePhoneNumber('+447123456789')).toBe('+447123456789');
      expect(normalizePhoneNumber('+911234567890')).toBe('+911234567890');
    });

    test('should handle numbers with spaces and special characters', () => {
      expect(normalizePhoneNumber('0712 345 678')).toBe('+254712345678');
      expect(normalizePhoneNumber('0712-345-678')).toBe('+254712345678');
      expect(normalizePhoneNumber('(0712) 345-678')).toBe('+254712345678');
    });

    test('should reject obviously invalid phone numbers', () => {
      expect(normalizePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber('   ')).toBeNull();
      expect(normalizePhoneNumber('071234567890123')).toBeNull(); // Too long
      expect(normalizePhoneNumber('07123')).toBeNull(); // Too short
      expect(normalizePhoneNumber('abc')).toBeNull();
      expect(normalizePhoneNumber('071234567a')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(normalizePhoneNumber(null as any)).toBeNull();
      expect(normalizePhoneNumber(undefined as any)).toBeNull();
      expect(normalizePhoneNumber(712345678 as any)).toBe('+254712345678');
    });
  });

  describe('normalizePhoneNumbers (batch)', () => {
    test('should normalize multiple phone numbers and track errors', () => {
      const phones = [
        '0712345678',
        'invalid',
        '0722345678',
        '071234567',
        '+254733345678'
      ];

      const result = normalizePhoneNumbers(phones);

      expect(result.normalized).toEqual([
        '+254712345678',
        '+254722345678',
        '+254733345678'
      ]);

      expect(result.errors).toEqual([
        { original: 'invalid', reason: 'Invalid phone number format or length' },
        { original: '071234567', reason: 'Invalid phone number format or length' }
      ]);
    });
  });

  describe('isValidNormalizedPhone', () => {
    test('should validate normalized phone numbers', () => {
      expect(isValidNormalizedPhone('+254712345678')).toBe(true);
      expect(isValidNormalizedPhone('+1234567890')).toBe(true);
      expect(isValidNormalizedPhone('+447123456789')).toBe(true);
    });

    test('should reject invalid normalized phone numbers', () => {
      expect(isValidNormalizedPhone('0712345678')).toBe(false);
      expect(isValidNormalizedPhone('254712345678')).toBe(false);
      expect(isValidNormalizedPhone('+25471234567')).toBe(false); // Too short
      expect(isValidNormalizedPhone('+2547123456789')).toBe(false); // Too long
      expect(isValidNormalizedPhone('')).toBe(false);
      expect(isValidNormalizedPhone(null as any)).toBe(false);
      expect(isValidNormalizedPhone('invalid')).toBe(false);
    });
  });
});
