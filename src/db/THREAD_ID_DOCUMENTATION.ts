// ===================================================================
// 📖 Thread ID Handling Documentation
// ===================================================================

/**
 * # String-Based Thread Identifier Support
 * 
 * This document describes how the messaging system now handles thread identifiers
 * in both numeric (legacy) and string (phone number) formats.
 * 
 * ## Overview
 * 
 * The database schema supports storing threadId as either:
 * - **Numeric IDs**: Legacy format (auto-incremented integers)
 * - **Phone Numbers/Strings**: Modern format (address-based threading)
 * 
 * All query functions now accept `threadId: string | number` and normalize internally.
 * 
 * ## Key Components
 * 
 * ### 1. Utility Functions (src/db/utils/threadIdUtils.ts)
 * 
 * These helper functions handle all thread ID transformations:
 * 
 * - **normalizeThreadId(threadId)**: Convert to string, throws if invalid
 *   ```typescript
 *   normalizeThreadId(123)           // → "123"
 *   normalizeThreadId("+1234567890") // → "+1234567890"
 *   normalizeThreadId(null)          // → throws Error
 *   ```
 * 
 * - **toThreadId(threadId, fallback)**: Safe version with fallback
 *   ```typescript
 *   toThreadId(123, "default")       // → "123"
 *   toThreadId(null, "default")      // → "default"
 *   ```
 * 
 * - **isValidThreadId(threadId)**: Validate without throwing
 *   ```typescript
 *   isValidThreadId(123)             // → true
 *   isValidThreadId("")              // → false
 *   ```
 * 
 * - **cleanThreadId(threadId)**: Remove phone number formatting
 *   ```typescript
 *   cleanThreadId("(123) 456-7890")  // → "1234567890"
 *   ```
 * 
 * - **isPhoneThreadId(threadId)**: Check if phone number format
 *   ```typescript
 *   isPhoneThreadId("+1234567890")   // → true
 *   isPhoneThreadId("123")           // → false
 *   ```
 * 
 * - **isNumericThreadId(threadId)**: Check if numeric format
 *   ```typescript
 *   isNumericThreadId("12345")       // → true
 *   isNumericThreadId("+1234567890") // → false
 *   ```
 * 
 * ### 2. Message Repository Updates (src/db/repositories/messages.ts)
 * 
 * Key functions now handle string-based identifiers:
 * 
 * - **getMessagesByThread(threadId, limit)**
 *   - Accepts: `string | number`
 *   - Returns: All messages in thread, newest first
 *   - Example: `getMessagesByThread("+1234567890")` or `getMessagesByThread(42)`
 * 
 * - **getMessagesByThreadId(threadId, limit)** *(new)*
 *   - Alias for getMessagesByThread
 *   - Emphasizes string ID usage
 * 
 * - **getMessagesByAddressComplete(address, limit)** *(new)*
 *   - Lookup by address field AND threadId
 *   - Useful for finding messages from/to a phone number
 *   - Example: `getMessagesByAddressComplete("+1234567890")`
 * 
 * - **markThreadRead(threadId)**
 *   - Accepts: `string | number`
 *   - Marks all thread messages as read
 * 
 * - **archiveThread(threadId)**
 *   - Accepts: `string | number`
 *   - Archives all messages in thread
 * 
 * ### 3. Thread Repository Updates (src/db/repositories/threads.ts)
 * 
 * Thread-level functions with enhanced support:
 * 
 * - **getThreadDetails(threadId)**
 *   - Accepts: `string | number`
 *   - Returns: Complete MessageThread with all messages
 *   - Fallback: Also searches by address if threadId lookup fails
 *   - Example: `getThreadDetails("+1234567890")`
 * 
 * - **getThreadByAddress(address)** *(new)*
 *   - Convenience function for phone number lookup
 *   - Example: `getThreadByAddress("+1234567890")`
 * 
 * - **getThreadByNumericId(threadId)** *(new)*
 *   - Convenience function for numeric ID lookup
 *   - Example: `getThreadByNumericId(42)`
 * 
 * ### 4. Message Provider Updates (src/providers/MessageProvider.tsx)
 * 
 * Provider methods now properly normalize thread IDs:
 * 
 * - **sendMessage(params)**
 *   - Normalizes `threadId` before database insertion
 *   - Falls back to address if threadId not provided
 * 
 * - **getThreadMessages(threadId)**
 *   - Accepts: `string | number`
 *   - Calls normalized getThreadDetails
 * 
 * - **markThreadRead(threadId)**
 *   - Accepts: `string | number`
 *   - Normalizes before database update
 * 
 * ## Database Schema
 * 
 * ```sql
 * CREATE TABLE messages (
 *   id INTEGER PRIMARY KEY,
 *   address TEXT NOT NULL,           -- Phone number or sender/recipient
 *   body TEXT NOT NULL,
 *   type TEXT NOT NULL,              -- 'incoming' | 'outgoing' | 'mms'
 *   status TEXT NOT NULL,            -- 'pending' | 'sent' | 'delivered' | 'failed'
 *   timestamp INTEGER NOT NULL,
 *   threadId TEXT,                   -- CAN be numeric string or phone number
 *   simSlot INTEGER,
 *   isRead INTEGER DEFAULT 0,
 *   isArchived INTEGER DEFAULT 0
 * );
 * ```
 * 
 * The `threadId` column stores:
 * - Phone numbers: "+1234567890", "254712345678", etc.
 * - Numeric IDs: "1", "42", "12345", etc.
 * - Empty/NULL: Falls back to address field
 * 
 * ## Usage Examples
 * 
 * ### Example 1: Load a thread by phone number
 * ```typescript
 * import { getThreadDetails } from '@/db/repositories/threads';
 * 
 * const phoneNumber = "+1234567890";
 * const thread = await getThreadDetails(phoneNumber);
 * console.log(thread.messages); // All messages in this thread
 * ```
 * 
 * ### Example 2: Mark thread as read (phone number)
 * ```typescript
 * import { useMessageContext } from '@/providers/MessageProvider';
 * 
 * const { markThreadRead } = useMessageContext();
 * await markThreadRead("+1234567890");
 * ```
 * 
 * ### Example 3: Send message to phone number
 * ```typescript
 * const { sendMessage } = useMessageContext();
 * 
 * await sendMessage({
 *   address: "+1234567890",
 *   body: "Hello!",
 *   type: "outgoing",
 *   threadId: "+1234567890" // Now accepts string or number
 * });
 * ```
 * 
 * ### Example 4: Retrieve messages by address (including fallback)
 * ```typescript
 * import { getMessagesByAddressComplete } from '@/db/repositories/messages';
 * 
 * const messages = await getMessagesByAddressComplete("+1234567890");
 * // Returns messages where address = "+1234567890" OR threadId = "+1234567890"
 * ```
 * 
 * ### Example 5: Query with mixed ID types
 * ```typescript
 * // All these work the same way:
 * await getThreadDetails("+1234567890");  // String phone number
 * await getThreadDetails("1234567890");   // String numeric ID
 * await getThreadDetails(42);             // Numeric ID
 * ```
 * 
 * ## Migration Path
 * 
 * Existing code using numeric IDs continues to work unchanged:
 * 
 * ```typescript
 * // Old code (still works):
 * const thread = await getThreadDetails("42");
 * 
 * // New code (also works):
 * const thread = await getThreadDetails(42);
 * 
 * // New code (phone number):
 * const thread = await getThreadDetails("+1234567890");
 * ```
 * 
 * ## Best Practices
 * 
 * 1. **Always normalize at boundaries**: When accepting user input, use normalizeThreadId()
 * 2. **Prefer phone numbers**: When possible, use phone numbers as threadId for clarity
 * 3. **Use type-specific helpers**: Call getThreadByAddress() or getThreadByNumericId() 
 *    when you know the ID type
 * 4. **Handle fallbacks gracefully**: getThreadDetails checks both threadId and address
 * 5. **Test with both formats**: Ensure your code works with both numeric and string IDs
 * 
 * ## Type Safety
 * 
 * All thread ID parameters now have type `string | number`:
 * 
 * ```typescript
 * // Type-safe, accepts both:
 * async function getThreadDetails(threadId: string | number): Promise<MessageThread>
 * 
 * // All valid:
 * getThreadDetails(42);
 * getThreadDetails("42");
 * getThreadDetails("+1234567890");
 * ```
 * 
 * ## Error Handling
 * 
 * Thread ID validation functions:
 * 
 * - **normalizeThreadId()**: Throws if invalid
 *   - Use when you want strict validation
 * 
 * - **toThreadId()**: Returns fallback if invalid
 *   - Use when you want graceful degradation
 * 
 * - **isValidThreadId()**: Returns boolean
 *   - Use for conditional logic
 * 
 * ## Performance Considerations
 * 
 * 1. **Database Indexing**: Ensure `threadId` column is indexed
 * 2. **Address Fallback**: getMessagesByAddressComplete() does dual lookup
 *    - Consider caching if frequently called
 * 3. **Normalization**: All functions normalize IDs at entry points
 *    - Performance impact is negligible for typical usage
 * 
 * ---
 * 
 * **Last Updated**: December 15, 2025
 * **Version**: 1.0
 */

export {}; // Module marker
