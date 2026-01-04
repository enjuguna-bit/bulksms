/**
 * ===================================================================
 * 🧪 src/utils/__tests__/transactionValidation.test.ts
 * Comprehensive tests for transaction validation utilities
 * ===================================================================
 */

import {
  validateAmount,
  validatePhoneNumber,
  validateTransaction,
  assessMessageAuthenticity,
  detectConflict,
  TRANSACTION_LIMITS,
} from "../transactionValidation";

describe("Transaction Validation", () => {
  // ===================================================================
  // Amount Validation Tests
  // ===================================================================

  describe("validateAmount", () => {
    it("should extract valid amount from KES format", () => {
      const result = validateAmount("Confirmed. KES 5,000");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(5000);
      expect(result.warnings.length).toBe(0);
    });

    it("should extract amount from Ksh format", () => {
      const result = validateAmount("Payment received Ksh 2500");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(2500);
    });

    it("should handle amounts with decimals", () => {
      const result = validateAmount("KES 1,234.50");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(1234.5);
    });

    it("should reject amounts below minimum", () => {
      const result = validateAmount(`KES ${TRANSACTION_LIMITS.MIN_AMOUNT - 1}`);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too small");
    });

    it("should reject amounts above maximum", () => {
      const result = validateAmount(
        `KES ${TRANSACTION_LIMITS.MAX_AMOUNT + 1000}`
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should warn on unusual amounts", () => {
      const result = validateAmount(`KES ${TRANSACTION_LIMITS.REASONABLE_AMOUNT + 1000}`);
      expect(result.valid).toBe(true);
      expect(result.isUnusual).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should return error for missing amount", () => {
      const result = validateAmount("No payment details here");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("No amount");
    });

    it("should detect suspicious patterns", () => {
      const result = validateAmount("KES 11111"); // Repeated digits
      expect(result.valid).toBe(true);
      expect(result.isUnusual).toBe(true);
      expect(result.warnings.some((w) => w.includes("Repeated"))).toBe(true);
    });
  });

  // ===================================================================
  // Phone Number Validation Tests
  // ===================================================================

  describe("validatePhoneNumber", () => {
    it("should accept valid Kenya phone numbers", () => {
      const result = validatePhoneNumber("254712345678");
      expect(result.valid).toBe(true);
      expect(result.phone).toBe("254712345678");
    });

    it("should normalize phone from different formats", () => {
      const formats = [
        "+254712345678",
        "0712345678",
        "254712345678",
      ];

      for (const format of formats) {
        const result = validatePhoneNumber(format);
        expect(result.phone).toBe("254712345678");
      }
    });

    it("should identify M-PESA provider", () => {
      const result = validatePhoneNumber("254712345678");
      expect(result.provider).toBe("M-PESA");
    });

    it("should reject non-Kenya numbers", () => {
      const result = validatePhoneNumber("441234567890"); // UK
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Kenya");
    });

    it("should reject invalid lengths", () => {
      const result = validatePhoneNumber("254123"); // Too short
      expect(result.valid).toBe(false);
      expect(result.error).toContain("length");
    });

    it("should reject empty phone", () => {
      const result = validatePhoneNumber("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should warn on suspicious patterns", () => {
      const result = validatePhoneNumber("254711111111"); // Repeated digits
      expect(result.warnings.some((w) => w.includes("Repeated"))).toBe(true);
    });
  });

  // ===================================================================
  // Message Authenticity Tests
  // ===================================================================

  describe("assessMessageAuthenticity", () => {
    it("should score authentic M-PESA messages high", () => {
      const message =
        "M-PESA Confirmed. You have received KES 5,000 from John 0712345678 on 01/01/2025 at 14:30 STD. Reference: QAB123ABC";
      const result = assessMessageAuthenticity(message, undefined, {
        valid: true,
        phone: "254712345678",
        warnings: []
      });

      if (!result.authentic) require('fs').writeFileSync('debug_auth.json', JSON.stringify(result, null, 2));
      expect(result.authentic).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.indicators.hasValidSender).toBe(true);
      expect(result.indicators.hasValidKeywords).toBe(true);
    });

    it("should score suspicious messages low", () => {
      const message = "Hey, I sent you some money. Check it out!";
      const result = assessMessageAuthenticity(message);

      expect(result.authentic).toBe(false);
      expect(result.score).toBeLessThan(70);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should detect missing sender info", () => {
      const message = "You received KES 5000 today";
      const result = assessMessageAuthenticity(message);

      expect(result.indicators.hasValidSender).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should detect missing action keywords", () => {
      const message = "M-PESA: This is a notification";
      const result = assessMessageAuthenticity(message);

      expect(result.indicators.hasValidKeywords).toBe(false);
    });
  });

  // ===================================================================
  // Transaction Validation Tests
  // ===================================================================

  describe("validateTransaction", () => {
    it("should validate complete transaction", () => {
      const message = "M-PESA Confirmed. You received KES 5,000 from John on 01/01/2025";
      const result = validateTransaction(message, "254712345678");

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.amountValid).toBe(true);
      expect(result.phoneValid).toBe(true);
    });

    it("should catch invalid amount", () => {
      const result = validateTransaction(
        "No amount here",
        "254712345678"
      );

      expect(result.amountValid).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should catch invalid phone", () => {
      const result = validateTransaction(
        "Confirmed. KES 5000 from John",
        "invalid"
      );

      expect(result.phoneValid).toBe(false);
      expect(result.valid).toBe(false);
    });

    it("should collect multiple errors", () => {
      const result = validateTransaction(
        "No details",
        "invalid-phone"
      );

      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  // ===================================================================
  // Conflict Detection Tests
  // ===================================================================

  describe("detectConflict", () => {
    const existingRecords = [
      {
        phone: "254712345678",
        rawMessage: "Confirmed. KES 5,000 received",
        lastSeen: Date.now() - 30000, // 30 seconds ago
      },
    ];

    it("should detect exact duplicates", () => {
      const result = detectConflict(
        "254712345678",
        5000,
        Date.now(),
        existingRecords
      );

      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe("EXACT_DUPLICATE");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
    });

    it("should detect similar transactions", () => {
      const records = [
        {
          phone: "254712345678",
          rawMessage: "Confirmed. KES 5,000 received",
          lastSeen: Date.now() - 180000, // 3 minutes ago
        },
      ];

      const result = detectConflict(
        "254712345678",
        5000,
        Date.now(), // Now (3 minutes difference)
        records
      );

      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe("SIMILAR_TRANSACTION");
    });

    it("should not detect conflict for different phone", () => {
      const result = detectConflict(
        "254798765432",
        5000,
        Date.now(),
        existingRecords
      );

      expect(result.hasConflict).toBe(false);
      expect(result.type).toBe("NONE");
    });

    it("should not detect conflict for different amount", () => {
      const result = detectConflict(
        "254712345678",
        3000,
        Date.now(),
        existingRecords
      );

      expect(result.hasConflict).toBe(false);
    });

    it("should not detect conflict outside time window", () => {
      const result = detectConflict(
        "254712345678",
        5000,
        Date.now() - 400000, // 6+ minutes ago
        existingRecords
      );

      expect(result.hasConflict).toBe(false);
    });
  });
});
