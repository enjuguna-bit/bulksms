/**
 * ===================================================================
 * 💼 src/utils/transactionValidation.ts
 * Advanced validation layer for payment transactions
 * ===================================================================
 *
 * Provides comprehensive validation for:
 * - Amount validation (range, format, reasonableness)
 * - Phone number normalization and validation
 * - SMS authenticity checks (pattern matching, sender validation)
 * - Data quality verification
 * - Conflict detection
 */

import { normalizePhone } from "./dataParsers";

// ===================================================================
// Configuration
// ===================================================================

export const TRANSACTION_LIMITS = {
  MIN_AMOUNT: 1, // KES
  MAX_AMOUNT: 500000, // KES - reasonable upper limit
  REASONABLE_AMOUNT: 100000, // Flag amounts above this
  TYPICAL_MERCHANT_AMOUNT: 50000, // Common merchant payment
} as const;

export const PHONE_PATTERNS = {
  // Kenya
  MPESA: /^254(7|1)[0-9]{8}$/, // 254712345678
  AIRTEL: /^254(77|76|73)[0-9]{7}$/, // 25477 numbers
  EQUITY: /^254(74)[0-9]{8}$/, // 254741234567
} as const;

export const SUSPICIOUS_PATTERNS = {
  REPEATED_DIGITS: /(\d)\1{4,}/g, // 55555
  SEQUENTIAL_DIGITS: /(01234|12345|23456|34567|45678|56789)/g,
  TYPO_PATTERNS: /[0-9]{2,}\s[0-9]{2,}/g, // Double spaces in numbers
} as const;

// ===================================================================
// Amount Validation
// ===================================================================

export interface AmountValidationResult {
  valid: boolean;
  amount: number | null;
  error?: string;
  warnings: string[];
  isUnusual: boolean;
}

/**
 * Extract and validate amount from message
 * Handles: "KES 1,234.50", "Ksh 5000", "100 shillings"
 */
export function validateAmount(message: string): AmountValidationResult {
  const warnings: string[] = [];

  // Extract amount patterns
  const patterns = [
    /KES\s?([\d,]+(?:\.\d{2})?)/i, // KES 1,234.50
    /Ksh\s?([\d,]+(?:\.\d{2})?)/i, // Ksh 5000
    /[\d,]+(?:\.\d{2})?\s?(?:shilling|KES|Ksh)/i, // 5000 shillings
  ];

  let amountStr: string | null = null;
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      amountStr = match[1] || match[0];
      break;
    }
  }

  if (!amountStr) {
    return {
      valid: false,
      amount: null,
      error: "No amount found in message",
      warnings,
      isUnusual: false,
    };
  }

  // Parse amount
  const cleanAmount = amountStr.replace(/,/g, "").trim();
  const amount = parseFloat(cleanAmount);

  // Validate number
  if (isNaN(amount)) {
    return {
      valid: false,
      amount: null,
      error: `Invalid amount format: "${amountStr}"`,
      warnings,
      isUnusual: false,
    };
  }

  // Range validation
  if (amount < TRANSACTION_LIMITS.MIN_AMOUNT) {
    return {
      valid: false,
      amount,
      error: `Amount too small: KES ${amount} (minimum: KES ${TRANSACTION_LIMITS.MIN_AMOUNT})`,
      warnings,
      isUnusual: true,
    };
  }

  if (amount > TRANSACTION_LIMITS.MAX_AMOUNT) {
    return {
      valid: false,
      amount,
      error: `Amount too large: KES ${amount} (maximum: KES ${TRANSACTION_LIMITS.MAX_AMOUNT})`,
      warnings,
      isUnusual: true,
    };
  }

  // Reasonableness checks
  if (amount > TRANSACTION_LIMITS.REASONABLE_AMOUNT) {
    warnings.push(
      `High amount: KES ${amount.toLocaleString()} (unusual for typical transaction)`
    );
  }

  // Check for suspicious patterns (typed amounts)
  if (SUSPICIOUS_PATTERNS.REPEATED_DIGITS.test(cleanAmount)) {
    warnings.push("Suspicious: Repeated digits pattern detected");
  }

  if (SUSPICIOUS_PATTERNS.SEQUENTIAL_DIGITS.test(cleanAmount)) {
    warnings.push("Suspicious: Sequential digits pattern detected");
  }

  return {
    valid: true,
    amount,
    warnings,
    isUnusual: warnings.length > 0,
  };
}

// ===================================================================
// Phone Number Validation
// ===================================================================

export interface PhoneValidationResult {
  valid: boolean;
  phone: string | null;
  error?: string;
  warnings: string[];
  provider?: "M-PESA" | "Airtel" | "Equity" | "Unknown";
}

/**
 * Validate phone number format and normalize
 * Handles: "+254712345678", "0712345678", "254712345678"
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  const warnings: string[] = [];

  if (!phone || typeof phone !== "string") {
    return {
      valid: false,
      phone: null,
      error: "Phone number is empty or invalid",
      warnings,
    };
  }

  // Normalize phone
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return {
      valid: false,
      phone: null,
      error: `Cannot normalize phone: "${phone}"`,
      warnings,
    };
  }

  // Must be 12 digits (Kenya format)
  if (normalized.length !== 12) {
    return {
      valid: false,
      phone: normalized,
      error: `Invalid phone length: ${normalized.length} digits (expected 12)`,
      warnings,
    };
  }

  // Must start with 254 (Kenya)
  if (!normalized.startsWith("254")) {
    return {
      valid: false,
      phone: normalized,
      error: `Not a Kenya phone number (must start with 254)`,
      warnings,
    };
  }

  // Identify provider
  let provider: "M-PESA" | "Airtel" | "Equity" | "Unknown" = "Unknown";

  if (PHONE_PATTERNS.MPESA.test(normalized)) {
    provider = "M-PESA";
  } else if (PHONE_PATTERNS.AIRTEL.test(normalized)) {
    provider = "Airtel";
  } else if (PHONE_PATTERNS.EQUITY.test(normalized)) {
    provider = "Equity";
  } else {
    warnings.push(`Unknown provider for number: ${normalized}`);
  }

  // Check for suspicious patterns
  if (SUSPICIOUS_PATTERNS.REPEATED_DIGITS.test(normalized)) {
    warnings.push("Suspicious: Repeated digits in phone number");
  }

  return {
    valid: true,
    phone: normalized,
    warnings,
    provider,
  };
}

// ===================================================================
// Message Authenticity
// ===================================================================

export interface MessageAuthenticationResult {
  authentic: boolean;
  score: number; // 0-100
  indicators: {
    hasValidSender: boolean;
    hasValidKeywords: boolean;
    hasValidStructure: boolean;
    hasValidAmount: boolean;
    hasValidPhone: boolean;
  };
  issues: string[];
}

const AUTHENTIC_SENDERS = [
  "M-PESA",
  "MPESA",
  "SAFARICOM",
  "EQUITEL",
  "AIRTEL",
  "BANK",
];

const PAYMENT_KEYWORDS = [
  "confirmed",
  "received",
  "sent",
  "paid",
  "payment",
  "deposit",
  "withdrawal",
  "transferred",
  "ksh",
  "kes",
];

/**
 * Assess authenticity of a payment message
 * Uses heuristics: sender, keywords, structure, data validity
 */
export function assessMessageAuthenticity(
  message: string,
  _amountResult?: AmountValidationResult,
  _phoneResult?: PhoneValidationResult
): MessageAuthenticationResult {
  const issues: string[] = [];
  let score = 0;

  const text = message.toUpperCase().trim();

  // ✅ Check 1: Valid sender (score: 0-20)
  let hasValidSender = false;
  for (const sender of AUTHENTIC_SENDERS) {
    if (text.includes(sender)) {
      hasValidSender = true;
      score += 20;
      break;
    }
  }
  if (!hasValidSender) {
    issues.push("Unknown sender - not a recognized mobile money provider");
  }

  // ✅ Check 2: Valid keywords (score: 0-20)
  const keywordMatches = PAYMENT_KEYWORDS.filter((kw) =>
    text.includes(kw)
  ).length;
  const hasValidKeywords = keywordMatches >= 2;
  if (hasValidKeywords) {
    score += 20;
  } else {
    issues.push(
      `Missing payment keywords (found ${keywordMatches}/2 minimum required)`
    );
  }

  // ✅ Check 3: Valid structure (score: 0-20)
  const hasReferenceCode = /[A-Z0-9]{8,12}/.test(text); // Reference number
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text); // Date
  const hasValidStructure = hasReferenceCode || hasDate;
  if (hasValidStructure) {
    score += 20;
  } else {
    issues.push("Missing reference code or date");
  }

  // ✅ Check 4: Valid amount (score: 0-20)
  const amountResult = _amountResult || validateAmount(message);
  const hasValidAmount = amountResult.valid;
  if (hasValidAmount) {
    score += 20;
    if (amountResult.isUnusual) {
      score -= 5; // Slight penalty for unusual amounts
    }
  } else {
    issues.push(`Invalid amount: ${amountResult.error}`);
  }

  // ✅ Check 5: Valid phone (score: 0-20)
  const phoneResult = _phoneResult || validatePhoneNumber("");
  const hasValidPhone = phoneResult.valid;
  if (hasValidPhone) {
    score += 20;
  } else {
    issues.push(`Invalid phone: ${phoneResult.error}`);
  }

  // Ensure score is in valid range
  score = Math.max(0, Math.min(100, score));

  return {
    authentic: score >= 70 && issues.length === 0, // 70% threshold
    score,
    indicators: {
      hasValidSender,
      hasValidKeywords,
      hasValidStructure,
      hasValidAmount,
      hasValidPhone,
    },
    issues,
  };
}

// ===================================================================
// Transaction Record Validation
// ===================================================================

export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  amountValid: boolean;
  phoneValid: boolean;
  messageAuthentic: boolean;
}

/**
 * Comprehensive transaction validation
 * Runs all checks: amount, phone, message authenticity
 */
export function validateTransaction(
  message: string,
  phone: string,
  amount?: string
): TransactionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate amount
  const amountResult = amount ? validateAmount(amount) : validateAmount(message);
  if (!amountResult.valid) {
    errors.push(amountResult.error || "Invalid amount");
  }
  warnings.push(...amountResult.warnings);

  // Validate phone
  const phoneResult = validatePhoneNumber(phone);
  if (!phoneResult.valid) {
    errors.push(phoneResult.error || "Invalid phone number");
  }
  warnings.push(...phoneResult.warnings);

  // Assess message authenticity
  const authResult = assessMessageAuthenticity(message, amountResult, phoneResult);
  if (!authResult.authentic) {
    warnings.push(...authResult.issues);
  }

  return {
    valid: errors.length === 0 && authResult.authentic,
    errors,
    warnings,
    amountValid: amountResult.valid,
    phoneValid: phoneResult.valid,
    messageAuthentic: authResult.authentic,
  };
}

// ===================================================================
// Conflict Detection
// ===================================================================

export interface ConflictDetectionResult {
  hasConflict: boolean;
  type: "EXACT_DUPLICATE" | "SIMILAR_TRANSACTION" | "NONE";
  conflictingRecord?: {
    phone: string;
    amount?: number;
    lastSeen: number;
    rawMessage: string;
  };
  confidenceScore: number; // 0-100
}

/**
 * Detect if a transaction conflicts with an existing one
 * Types:
 * - EXACT_DUPLICATE: Same phone, amount, timestamp within 60 seconds
 * - SIMILAR_TRANSACTION: Same phone, amount, within 5 minutes
 * - NONE: No conflict detected
 */
export function detectConflict(
  newPhone: string,
  newAmount: number | undefined,
  newTimestamp: number,
  existingRecords: Array<{
    phone: string;
    rawMessage: string;
    lastSeen: number;
  }>
): ConflictDetectionResult {
  const timeWindowMs = {
    exactDuplicate: 60000, // 1 minute
    similarTransaction: 300000, // 5 minutes
  };

  for (const record of existingRecords) {
    if (record.phone !== newPhone) continue;

    const timeDiff = newTimestamp - record.lastSeen;

    // Extract amount from existing record
    const existingAmountMatch = record.rawMessage.match(/KES\s?([\d,]+)/i);
    const existingAmount = existingAmountMatch
      ? parseFloat(existingAmountMatch[1].replace(/,/g, ""))
      : undefined;

    // ✅ Check for exact duplicate (same phone, amount, within 1 minute)
    if (
      newAmount === existingAmount &&
      timeDiff >= 0 &&
      timeDiff <= timeWindowMs.exactDuplicate
    ) {
      return {
        hasConflict: true,
        type: "EXACT_DUPLICATE",
        conflictingRecord: {
          phone: record.phone,
          amount: existingAmount,
          lastSeen: record.lastSeen,
          rawMessage: record.rawMessage,
        },
        confidenceScore: 98, // Very high confidence
      };
    }

    // ✅ Check for similar transaction (same phone and amount, within 5 minutes)
    if (
      newAmount === existingAmount &&
      timeDiff >= 0 &&
      timeDiff <= timeWindowMs.similarTransaction
    ) {
      return {
        hasConflict: true,
        type: "SIMILAR_TRANSACTION",
        conflictingRecord: {
          phone: record.phone,
          amount: existingAmount,
          lastSeen: record.lastSeen,
          rawMessage: record.rawMessage,
        },
        confidenceScore: 75, // Moderate confidence
      };
    }
  }

  return {
    hasConflict: false,
    type: "NONE",
    confidenceScore: 0,
  };
}

// ===================================================================
// Export Summary
// ===================================================================

export const TransactionValidation = {
  // Validation functions
  validateAmount,
  validatePhoneNumber,
  validateTransaction,
  assessMessageAuthenticity,
  detectConflict,

  // Config
  TRANSACTION_LIMITS,
  PHONE_PATTERNS,
  SUSPICIOUS_PATTERNS,
} as const;
