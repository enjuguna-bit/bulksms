/**
 * ===================================================================
 * 🧪 src/utils/__tests__/transactionDeduplication.test.ts
 * Comprehensive tests for deduplication utilities
 * ===================================================================
 */

import {
  hashMessageContent,
  extractMessageSignature,
  calculateMessageSimilarity,
  deduplicateMessages,
  groupMessagesByPhone,
  findDuplicateGroups,
  TransactionDuplicateDetector,
} from "../transactionDeduplication";

describe("Transaction Deduplication", () => {
  // ===================================================================
  // Content Hashing Tests
  // ===================================================================

  describe("hashMessageContent", () => {
    it("should produce consistent hashes", () => {
      const message = "Confirmed. KES 5,000 from John";
      const hash1 = hashMessageContent(message);
      const hash2 = hashMessageContent(message);

      expect(hash1).toBe(hash2);
    });

    it("should normalize whitespace", () => {
      const msg1 = "Confirmed.  KES   5,000";
      const msg2 = "Confirmed. KES 5,000";

      expect(hashMessageContent(msg1)).toBe(hashMessageContent(msg2));
    });

    it("should be case-insensitive", () => {
      const msg1 = "CONFIRMED. KES 5,000";
      const msg2 = "confirmed. kes 5,000";

      expect(hashMessageContent(msg1)).toBe(hashMessageContent(msg2));
    });

    it("should produce different hashes for different messages", () => {
      const hash1 = hashMessageContent("Message 1");
      const hash2 = hashMessageContent("Message 2");

      expect(hash1).not.toBe(hash2);
    });
  });

  // ===================================================================
  // Signature Extraction Tests
  // ===================================================================

  describe("extractMessageSignature", () => {
    it("should extract amounts", () => {
      const sig = extractMessageSignature("Confirmed. KES 5,000");
      expect(sig.amounts).toContain(5000);
    });

    it("should extract reference codes", () => {
      const sig = extractMessageSignature(
        "Reference: QAB123ABC confirmed"
      );
      expect(sig.references).toContain("QAB123ABC");
    });

    it("should extract phone numbers", () => {
      const sig = extractMessageSignature("From 0712345678");
      expect(sig.phones).toContain("0712345678");
    });

    it("should handle multiple values", () => {
      const msg =
        "Received KES 5,000 and KES 3,000 from 0712345678 and 0798765432 ref ABC123XYZ";
      const sig = extractMessageSignature(msg);

      expect(sig.amounts.length).toBeGreaterThan(0);
      expect(sig.phones.length).toBeGreaterThan(0);
      expect(sig.references.length).toBeGreaterThan(0);
    });

    it("should return empty arrays for messages without values", () => {
      const sig = extractMessageSignature("No numeric data here");
      expect(sig.amounts).toEqual([]);
      expect(sig.phones).toEqual([]);
    });
  });

  // ===================================================================
  // Message Similarity Tests
  // ===================================================================

  describe("calculateMessageSimilarity", () => {
    it("should return 1 for identical messages", () => {
      const msg = "Confirmed. KES 5,000 from John";
      const similarity = calculateMessageSimilarity(msg, msg);

      expect(similarity).toBe(1);
    });

    it("should return 0 for completely different messages", () => {
      const similarity = calculateMessageSimilarity(
        "AAAA",
        "BBBB"
      );

      expect(similarity).toBeLessThan(0.5);
    });

    it("should score similar messages high", () => {
      const msg1 = "Confirmed. KES 5,000";
      const msg2 = "Confirmed. KES 5000";

      const similarity = calculateMessageSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("should be case-insensitive", () => {
      const sim1 = calculateMessageSimilarity("HELLO", "hello");
      const sim2 = calculateMessageSimilarity("HELLO", "HELLO");

      expect(sim1).toBe(sim2);
    });
  });

  // ===================================================================
  // Batch Deduplication Tests
  // ===================================================================

  describe("deduplicateMessages", () => {
    it("should remove exact duplicates", () => {
      const messages = [
        {
          message: "Message 1",
          phone: "0712345678",
          timestamp: 1000,
        },
        {
          message: "Message 1",
          phone: "0712345678",
          timestamp: 2000,
        },
        {
          message: "Message 2",
          phone: "0712345678",
          timestamp: 3000,
        },
      ];

      const result = deduplicateMessages(messages);
      expect(result.length).toBe(2);
      expect(result[0].message).toBe("Message 1");
      expect(result[1].message).toBe("Message 2");
    });

    it("should keep first occurrence", () => {
      const messages = [
        { message: "Test", phone: "0712345678", timestamp: 1000 },
        { message: "Test", phone: "0712345678", timestamp: 2000 },
      ];

      const result = deduplicateMessages(messages);
      expect(result[0].timestamp).toBe(1000);
    });

    it("should handle empty array", () => {
      const result = deduplicateMessages([]);
      expect(result.length).toBe(0);
    });

    it("should handle single message", () => {
      const messages = [
        { message: "Test", phone: "0712345678", timestamp: 1000 },
      ];

      const result = deduplicateMessages(messages);
      expect(result.length).toBe(1);
    });
  });

  // ===================================================================
  // Grouping Tests
  // ===================================================================

  describe("groupMessagesByPhone", () => {
    it("should group by phone number", () => {
      const messages = [
        {
          message: "Msg1",
          phone: "0712345678",
          timestamp: 1000,
        },
        {
          message: "Msg2",
          phone: "0712345678",
          timestamp: 2000,
        },
        {
          message: "Msg3",
          phone: "0798765432",
          timestamp: 3000,
        },
      ];

      const grouped = groupMessagesByPhone(messages);
      expect(grouped.size).toBe(2);
      expect(grouped.get("0712345678")?.length).toBe(2);
      expect(grouped.get("0798765432")?.length).toBe(1);
    });

    it("should handle empty array", () => {
      const grouped = groupMessagesByPhone([]);
      expect(grouped.size).toBe(0);
    });
  });

  // ===================================================================
  // Duplicate Group Detection Tests
  // ===================================================================

  describe("findDuplicateGroups", () => {
    it("should find groups with multiple messages within time window", () => {
      const baseTime = Date.now();
      const messages = [
        {
          message: "Msg1",
          phone: "0712345678",
          timestamp: baseTime,
        },
        {
          message: "Msg2",
          phone: "0712345678",
          timestamp: baseTime + 30000, // 30 seconds later
        },
        {
          message: "Msg3",
          phone: "0712345678",
          timestamp: baseTime + 60000, // 1 minute later
        },
      ];

      const groups = findDuplicateGroups(messages, 300000); // 5 min window
      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(3);
    });

    it("should not group messages outside time window", () => {
      const baseTime = Date.now();
      const messages = [
        {
          message: "Msg1",
          phone: "0712345678",
          timestamp: baseTime,
        },
        {
          message: "Msg2",
          phone: "0712345678",
          timestamp: baseTime + 400000, // 6+ minutes later
        },
      ];

      const groups = findDuplicateGroups(messages, 300000); // 5 min window
      expect(groups.length).toBe(0);
    });

    it("should handle single messages", () => {
      const messages = [
        {
          message: "Msg1",
          phone: "0712345678",
          timestamp: Date.now(),
        },
      ];

      const groups = findDuplicateGroups(messages);
      expect(groups.length).toBe(0);
    });
  });

  // ===================================================================
  // Stateful Detector Tests
  // ===================================================================

  describe("TransactionDuplicateDetector", () => {
    let detector: TransactionDuplicateDetector;

    beforeEach(() => {
      detector = new TransactionDuplicateDetector();
    });

    it("should detect exact duplicates", () => {
      const msg = "Confirmed. KES 5,000";
      const phone = "0712345678";
      const timestamp = Date.now();

      // First message should not be duplicate
      let result = detector.isDuplicate(msg, phone, timestamp);
      expect(result.isDuplicate).toBe(false);

      // Register it
      detector.registerMessage(msg, phone, timestamp);

      // Second identical message should be duplicate
      result = detector.isDuplicate(msg, phone, timestamp + 30000); // 30 sec later
      expect(result.isDuplicate).toBe(true);
      expect(result.type).toBe("EXACT");
    });

    it("should not flag duplicates after time window", () => {
      const msg = "Confirmed. KES 5,000";
      const phone = "0712345678";
      const timestamp = Date.now();

      detector.registerMessage(msg, phone, timestamp);

      // Message after time window should not be duplicate
      const result = detector.isDuplicate(msg, phone, timestamp + 360000); // 6 min later
      expect(result.isDuplicate).toBe(false);
    });

    it("should detect burst patterns", () => {
      const baseTime = Date.now();

      // Register 2 messages within 5 minutes
      detector.registerMessage("Msg1", "0712345678", baseTime);
      detector.registerMessage("Msg2", "0712345678", baseTime + 60000);

      // Third message triggers burst detection
      const result = detector.isDuplicate("Msg3", "0712345678", baseTime + 120000);
      expect(result.isDuplicate).toBe(true);
      expect(result.type).toBe("BURST");
    });

    it("should detect similar messages", () => {
      const baseTime = Date.now();

      detector.registerMessage("Confirmed. KES 5,000", "0712345678", baseTime);

      // Very similar message
      const result = detector.isDuplicate(
        "Confirmed. KES 5000",
        "0712345678",
        baseTime + 60000
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.type).toBe("SIMILAR");
    });

    it("should track statistics", () => {
      detector.registerMessage("Msg1", "0712345678", Date.now());
      detector.registerMessage("Msg2", "0798765432", Date.now());

      const stats = detector.getStats();
      expect(stats.totalHashes).toBeGreaterThan(0);
      expect(stats.phonesTracked).toBe(2);
    });

    it("should clear history", () => {
      detector.registerMessage("Msg1", "0712345678", Date.now());
      detector.clear();

      const stats = detector.getStats();
      expect(stats.totalHashes).toBe(0);
      expect(stats.phonesTracked).toBe(0);
    });
  });
});
