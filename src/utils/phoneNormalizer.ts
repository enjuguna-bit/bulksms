// ------------------------------------------------------
// 📘 src/utils/phoneNormalizer.ts
// Robust phone number normalization for bulk SMS
// Handles various formats and ensures consistent output
// ------------------------------------------------------

/**
 * Normalize phone number for bulk SMS sending
 * Converts various formats to international format (+254XXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-numeric characters except leading +
  let cleaned = phone.trim();

  // Handle international format with leading +
  const hasLeadingPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d]/g, '');

  if (hasLeadingPlus) {
    cleaned = '+' + cleaned;
  }

  // If empty after cleaning, return null
  if (!cleaned) {
    return null;
  }

  // Handle different formats
  if (cleaned.startsWith('+')) {
    // International format: +254712345678
    const withoutPlus = cleaned.substring(1);

    // If it's already +254 format, validate length
    if (withoutPlus.startsWith('254')) {
      const localNumber = withoutPlus.substring(3);
      if (localNumber.length >= 9 && localNumber.length <= 9) {
        return '+254' + localNumber;
      }
    }

    // For other international numbers, keep as is but validate basic length
    if (withoutPlus.length >= 10 && withoutPlus.length <= 15) {
      return cleaned;
    }

    return null;
  } else {
    // Local format: 0712345678, 712345678, 254712345678
    let digits = cleaned;

    // Handle leading 254 (without +)
    if (digits.startsWith('254')) {
      digits = digits.substring(3);
    }

    // Remove leading zero if present (0712345678 -> 712345678)
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // Validate Kenyan mobile number length (9 digits)
    if (digits.length !== 9) {
      return null;
    }

    // Validate that it starts with valid Kenyan mobile prefixes
    const validPrefixes = ['10', '11', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79'];
    const prefix = digits.substring(0, 2);
    if (!validPrefixes.includes(prefix)) {
      return null;
    }

    // Return in international format
    return '+254' + digits;
  }
}

/**
 * Batch normalize phone numbers with error tracking
 */
export function normalizePhoneNumbers(phones: string[]): {
  normalized: string[];
  errors: Array<{ original: string; reason: string }>;
} {
  const normalized: string[] = [];
  const errors: Array<{ original: string; reason: string }> = [];

  phones.forEach(phone => {
    const result = normalizePhoneNumber(phone);
    if (result) {
      normalized.push(result);
    } else {
      errors.push({
        original: phone,
        reason: 'Invalid phone number format or length'
      });
    }
  });

  return { normalized, errors };
}

/**
 * Validate normalized phone number format
 */
export function isValidNormalizedPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Must start with + and have valid length
  if (!phone.startsWith('+')) {
    return false;
  }

  const digitsOnly = phone.substring(1);
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return false;
  }

  // Must contain only digits after +
  return /^\+\d+$/.test(phone);
}
