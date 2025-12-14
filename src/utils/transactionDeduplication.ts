/**
 * ===================================================================
 * 🔄 src/utils/transactionDeduplication.ts
 * Advanced SMS deduplication and duplicate detection
 * ===================================================================
 *
 * Prevents processing of:
 * - Exact duplicate messages (same content within time window)
 * - Retransmitted messages (duplicate from same sender)
 * - Split/batch messages that are really one transaction
 *
 * Uses content hashing + timestamp for reliable deduplication
 */

import crypto from "crypto";

// ===================================================================
// Configuration
// ===================================================================

export const DEDUP_CONFIG = {
  CONTENT_HASH_WINDOW: 3600000, // 1 hour - keep hash history for this long
  EXACT_DUPLICATE_THRESHOLD: 60000, // 1 minute - exact content must be within this time
  SIMILAR_MESSAGE_THRESHOLD: 300000, // 5 minutes - similar messages within this
  SIMILARITY_THRESHOLD: 0.85, // 85% text similarity = similar message
  MAX_HASH_HISTORY_ENTRIES: 1000, // Limit memory usage
} as const;

// ===================================================================
// Content Hashing
// ===================================================================

/**
 * Create SHA-256 hash of message content
 * Normalizes whitespace and case for robust comparison
 */
export function hashMessageContent(message: string): string {
  const normalized = message
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Extract numeric content from message (for partial duplicate detection)
 * Focuses on amounts and reference numbers
 */
export function extractMessageSignature(message: string): {
  amounts: number[];
  references: string[];
  phones: string[];
} {
  const amounts: number[] = [];
  const references: string[] = [];
  const phones: string[] = [];

  // Extract amounts
  const amountMatches = message.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [];
  for (const match of amountMatches) {
    const num = parseFloat(match.replace(/,/g, ""));
    if (!isNaN(num)) amounts.push(num);
  }

  // Extract reference codes (8-12 alphanumeric)
  const refMatches = message.match(/\b[A-Z0-9]{8,12}\b/g) || [];
  references.push(...refMatches);

  // Extract phone numbers (7-12 digits)
  const phoneMatches = message.match(/\b\d{7,12}\b/g) || [];
  phones.push(...phoneMatches);

  return { amounts, references, phones };
}

/**
 * Calculate similarity between two messages (0-1 scale)
 * Uses character-level similarity (Levenshtein-like approach)
 */
export function calculateMessageSimilarity(
  message1: string,
  message2: string
): number {
  const s1 = message1.toLowerCase().replace(/\s+/g, " ");
  const s2 = message2.toLowerCase().replace(/\s+/g, " ");

  if (s1 === s2) return 1; // Perfect match

  // Simple character overlap scoring
  const chars1 = new Set(s1);
  const chars2 = new Set(s2);
  const overlap = new Set([...chars1].filter((x) => chars2.has(x))).size;
  const total = Math.max(chars1.size, chars2.size);

  return total === 0 ? 0 : overlap / total;
}

// ===================================================================
// Message Hash Entry
// ===================================================================

export interface MessageHashEntry {
  hash: string;
  phone: string;
  timestamp: number;
  originalMessage: string;
  signature: ReturnType<typeof extractMessageSignature>;
}

// ===================================================================
// Duplicate Detector (Stateful)
// ===================================================================

export class TransactionDuplicateDetector {
  private hashHistory: Map<string, MessageHashEntry> = new Map();
  private phoneTimestamps: Map<string, number[]> = new Map(); // Track message timestamps per phone

  /**
   * Check if message is a duplicate
   * Returns type of duplication detected
   */
  isDuplicate(
    message: string,
    phone: string,
    timestamp: number
  ): {
    isDuplicate: boolean;
    type: "EXACT" | "SIMILAR" | "BURST" | "NONE";
    previousMessage?: string;
    timeSinceLastMessage?: number;
  } {
    const contentHash = hashMessageContent(message);
    const signature = extractMessageSignature(message);
    const now = timestamp;

    // ✅ Check 1: Exact duplicate (same hash within time window)
    const existingEntry = this.hashHistory.get(contentHash);
    if (existingEntry) {
      const timeDiff = now - existingEntry.timestamp;

      if (timeDiff <= DEDUP_CONFIG.EXACT_DUPLICATE_THRESHOLD) {
        return {
          isDuplicate: true,
          type: "EXACT",
          previousMessage: existingEntry.originalMessage,
          timeSinceLastMessage: timeDiff,
        };
      }
    }

    // ✅ Check 2: Burst detection (multiple messages from same phone in short time)
    const phoneHistory = this.phoneTimestamps.get(phone) || [];
    const recentMessages = phoneHistory.filter(
      (ts) => now - ts <= DEDUP_CONFIG.SIMILAR_MESSAGE_THRESHOLD
    );

    if (recentMessages.length >= 2) {
      // 3+ messages (including new one) in 5 minutes = potential burst
      return {
        isDuplicate: true,
        type: "BURST",
        timeSinceLastMessage: now - recentMessages[recentMessages.length - 1],
      };
    }

    // ✅ Check 3: Similar messages from same phone (carrier retransmission)
    for (const entry of this.hashHistory.values()) {
      if (entry.phone !== phone) continue;
      if (now - entry.timestamp > DEDUP_CONFIG.SIMILAR_MESSAGE_THRESHOLD)
        continue;

      const similarity = calculateMessageSimilarity(
        message,
        entry.originalMessage
      );

      // Check signature match (amount + reference)
      const sigMatch =
        signature.amounts.length > 0 &&
        signature.amounts.some((amount) =>
          entry.signature.amounts.includes(amount)
        );

      if (similarity >= DEDUP_CONFIG.SIMILARITY_THRESHOLD || sigMatch) {
        return {
          isDuplicate: true,
          type: "SIMILAR",
          previousMessage: entry.originalMessage,
          timeSinceLastMessage: now - entry.timestamp,
        };
      }
    }

    return {
      isDuplicate: false,
      type: "NONE",
    };
  }

  /**
   * Register message in history
   * Called when message is successfully processed
   */
  registerMessage(
    message: string,
    phone: string,
    timestamp: number
  ): void {
    const hash = hashMessageContent(message);
    const signature = extractMessageSignature(message);

    // Store hash entry
    this.hashHistory.set(hash, {
      hash,
      phone,
      timestamp,
      originalMessage: message,
      signature,
    });

    // Track phone timestamps
    const phoneHistory = this.phoneTimestamps.get(phone) || [];
    phoneHistory.push(timestamp);

    // Keep only recent history (last 100 messages per phone)
    if (phoneHistory.length > 100) {
      phoneHistory.shift();
    }

    this.phoneTimestamps.set(phone, phoneHistory);

    // Cleanup old entries from hash history
    this.pruneOldEntries();
  }

  /**
   * Remove old entries from history to prevent memory bloat
   */
  private pruneOldEntries(): void {
    const now = Date.now();
    const cutoff = now - DEDUP_CONFIG.CONTENT_HASH_WINDOW;

    // Prune hash history
    for (const [hash, entry] of this.hashHistory.entries()) {
      if (entry.timestamp < cutoff) {
        this.hashHistory.delete(hash);
      }
    }

    // Prune phone timestamps
    for (const [phone, timestamps] of this.phoneTimestamps.entries()) {
      const filtered = timestamps.filter((ts) => ts >= cutoff);
      if (filtered.length === 0) {
        this.phoneTimestamps.delete(phone);
      } else {
        this.phoneTimestamps.set(phone, filtered);
      }
    }

    // If still too large, remove oldest entries
    if (this.hashHistory.size > DEDUP_CONFIG.MAX_HASH_HISTORY_ENTRIES) {
      const entries = Array.from(this.hashHistory.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      const toDelete = entries.length - DEDUP_CONFIG.MAX_HASH_HISTORY_ENTRIES;
      for (let i = 0; i < toDelete; i++) {
        this.hashHistory.delete(entries[i].hash);
      }
    }
  }

  /**
   * Get history statistics
   */
  getStats() {
    return {
      totalHashes: this.hashHistory.size,
      phonesTracked: this.phoneTimestamps.size,
      averageMessagesPerPhone: this.phoneTimestamps.size > 0
        ? Array.from(this.phoneTimestamps.values()).reduce((a, b) => a + b.length, 0) / this.phoneTimestamps.size
        : 0,
    };
  }

  /**
   * Clear all history (useful for testing or manual reset)
   */
  clear(): void {
    this.hashHistory.clear();
    this.phoneTimestamps.clear();
  }
}

// ===================================================================
// Batch Deduplication
// ===================================================================

/**
 * Remove duplicate messages from array
 * Keeps first occurrence, removes subsequent ones
 */
export function deduplicateMessages(
  messages: Array<{ message: string; phone: string; timestamp: number }>
): Array<{ message: string; phone: string; timestamp: number }> {
  const seen = new Set<string>();
  const result = [];

  for (const msg of messages) {
    const hash = hashMessageContent(msg.message);
    if (!seen.has(hash)) {
      seen.add(hash);
      result.push(msg);
    }
  }

  return result;
}

/**
 * Group messages by phone number
 */
export function groupMessagesByPhone(
  messages: Array<{ message: string; phone: string; timestamp: number }>
): Map<string, typeof messages> {
  const grouped = new Map<string, typeof messages>();

  for (const msg of messages) {
    const existing = grouped.get(msg.phone) || [];
    existing.push(msg);
    grouped.set(msg.phone, existing);
  }

  return grouped;
}

/**
 * Find potentially duplicate groups
 * (multiple messages from same phone, similar amounts, within timeframe)
 */
export function findDuplicateGroups(
  messages: Array<{ message: string; phone: string; timestamp: number }>,
  timeWindowMs: number = 300000 // 5 minutes
): Array<typeof messages> {
  const grouped = groupMessagesByPhone(messages);
  const duplicateGroups = [];

  for (const group of grouped.values()) {
    if (group.length <= 1) continue;

    // Sort by timestamp
    const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);

    // Find clusters within time window
    let cluster = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].timestamp - cluster[0].timestamp <= timeWindowMs) {
        cluster.push(sorted[i]);
      } else {
        if (cluster.length > 1) {
          duplicateGroups.push(cluster);
        }
        cluster = [sorted[i]];
      }
    }

    if (cluster.length > 1) {
      duplicateGroups.push(cluster);
    }
  }

  return duplicateGroups;
}

// ===================================================================
// Export
// ===================================================================

export const TransactionDeduplication = {
  // Functions
  hashMessageContent,
  extractMessageSignature,
  calculateMessageSimilarity,
  deduplicateMessages,
  groupMessagesByPhone,
  findDuplicateGroups,

  // Class
  TransactionDuplicateDetector,

  // Config
  DEDUP_CONFIG,
} as const;
