// ===================================================================
// 📚 src/db/examples/threadIdExamples.ts
// Real-world examples of using thread ID functions
// ===================================================================

import {
    getThreadDetails,
    getThreadByAddress,
    getThreadByNumericId,
} from '@/db/repositories/threads';

import {
    getMessagesByThread,
    getMessagesByThreadId,
    getMessagesByAddressComplete,
    markThreadRead,
    archiveThread,
    addMessage,
} from '@/db/repositories/messages';

import {
    normalizeThreadId,
    toThreadId,
    isPhoneThreadId,
    isNumericThreadId,
    isValidThreadId,
    cleanThreadId,
} from '@/db/utils/threadIdUtils';

// ===================================================================
// EXAMPLE 1: Load a conversation with a contact
// ===================================================================
export async function example1_LoadContactConversation() {
    const phoneNumber = '+254712345678';

    // Option 1: Direct phone number lookup
    const thread = await getThreadByAddress(phoneNumber);
    console.log('Thread loaded:', thread.threadId);
    console.log('Message count:', thread.messages.length);
    console.log('Unread count:', thread.unread);

    // Option 2: Using getThreadDetails (works with any ID)
    const thread2 = await getThreadDetails(phoneNumber);
    console.log('Same result:', thread2.threadId === thread.threadId);
}

// ===================================================================
// EXAMPLE 2: Retrieve all messages from a phone number
// ===================================================================
export async function example2_GetMessagesFromPhone() {
    const phoneNumber = '+254712345678';

    // Get messages where threadId = phone number
    const messages1 = await getMessagesByThreadId(phoneNumber);

    // Get messages where address = phone number (or threadId)
    const messages2 = await getMessagesByAddressComplete(phoneNumber);

    console.log('Messages by threadId:', messages1.length);
    console.log('Messages by address (comprehensive):', messages2.length);
}

// ===================================================================
// EXAMPLE 3: Handle mixed ID types from different sources
// ===================================================================
export async function example3_HandleMixedIdTypes() {
    // From native SMS module (might be string)
    const nativeThreadId: string | number = '+254712345678';

    // From database query (might be numeric string)
    const dbThreadId: string | number = '42';

    // From user input (could be anything)
    const userInput: any = '+1 (234) 567-8900';

    // All work seamlessly with normalization
    const thread1 = await getThreadDetails(nativeThreadId);
    const thread2 = await getThreadDetails(dbThreadId);
    const thread3 = await getThreadDetails(cleanThreadId(userInput));

    console.log('All threads loaded:', thread1, thread2, thread3);
}

// ===================================================================
// EXAMPLE 4: Mark thread as read for phone number
// ===================================================================
export async function example4_MarkThreadRead() {
    const phoneNumber = '+254712345678';

    // Mark all messages in thread as read
    await markThreadRead(phoneNumber);

    // Verify it worked
    const thread = await getThreadByAddress(phoneNumber);
    const unreadMessages = thread.messages.filter(m => !m.isRead);
    console.log('Unread count after marking read:', unreadMessages.length);
}

// ===================================================================
// EXAMPLE 5: Archive a conversation
// ===================================================================
export async function example5_ArchiveConversation() {
    const phoneNumber = '+254712345678';

    // Archive all messages in this thread
    await archiveThread(phoneNumber);

    // The messages are still there, just archived
    const thread = await getThreadByAddress(phoneNumber);
    const archivedMessages = thread.messages.filter(m => m.isArchived);
    console.log('Archived messages:', archivedMessages.length);
}

// ===================================================================
// EXAMPLE 6: Handle phone number with formatting
// ===================================================================
export async function example6_CleanFormattedPhone() {
    // User might enter phone number in various formats
    const userFormattedPhone = '(254) 712-345-678';
    const cleanedPhone = cleanThreadId(userFormattedPhone);

    // Now we can look it up
    const thread = await getThreadDetails(cleanedPhone);
    console.log('Thread for cleaned number:', thread.threadId);
}

// ===================================================================
// EXAMPLE 7: Fallback lookup - by thread ID, then by address
// ===================================================================
export async function example7_FallbackLookup() {
    const phoneNumber = '+254712345678';

    // getThreadDetails automatically tries both:
    // 1. First looks for messages where threadId = phoneNumber
    // 2. If not found, looks for messages where address = phoneNumber
    const thread = await getThreadDetails(phoneNumber);

    if (thread.messages.length === 0) {
        console.log('No messages found for this phone number');
    } else {
        console.log('Found', thread.messages.length, 'messages');
    }
}

// ===================================================================
// EXAMPLE 8: Validate user input before querying
// ===================================================================
export async function example8_ValidateInput() {
    const userInput = getUserInput(); // Some user input

    try {
        // Strict validation - throws if invalid
        const normalizedId = normalizeThreadId(userInput);
        const thread = await getThreadDetails(normalizedId);
        console.log('Thread found:', thread.threadId);
    } catch (error) {
        console.error('Invalid thread ID:', userInput);
        // Handle error gracefully
    }
}

// ===================================================================
// EXAMPLE 9: Safe lookup with fallback
// ===================================================================
export async function example9_SafeLookup() {
    const userInput = getUserInput();

    // Safe version - returns empty string if invalid
    const threadId = toThreadId(userInput, '');

    if (threadId) {
        const thread = await getThreadDetails(threadId);
        console.log('Thread found:', thread.threadId);
    } else {
        console.log('Invalid input, using default');
    }
}

// ===================================================================
// EXAMPLE 10: Type-specific lookups
// ===================================================================
export async function example10_TypeSpecificLookups() {
    // When you know the type, use specific functions
    const phoneNumber = '+254712345678';
    const numericId = 42;

    // Phone number lookup
    const phoneThread = await getThreadByAddress(phoneNumber);
    console.log('Phone thread:', phoneThread.threadId);

    // Numeric ID lookup
    const numericThread = await getThreadByNumericId(numericId);
    console.log('Numeric thread:', numericThread.threadId);

    // Generic lookup (works for both)
    const genericThread1 = await getThreadDetails(phoneNumber);
    const genericThread2 = await getThreadDetails(numericId);
}

// ===================================================================
// EXAMPLE 11: Batch operations (conceptual)
// ===================================================================
export async function example11_BatchOperations() {
    const phoneNumbers = [
        '+254712345678',
        '+254701234567',
        '+254798765432',
    ];

    // Mark multiple threads as read
    for (const phone of phoneNumbers) {
        await markThreadRead(phone);
    }

    console.log('Marked', phoneNumbers.length, 'threads as read');
}

// ===================================================================
// EXAMPLE 12: Classification of thread IDs
// ===================================================================
export async function example12_ClassifyThreadIds() {
    const ids = ['+254712345678', '42', 'user-thread-123'];

    ids.forEach(id => {
        const isPhone = isPhoneThreadId(id);
        const isNumeric = isNumericThreadId(id);

        console.log(`${id}:`, {
            isPhone,
            isNumeric,
            type: isPhone ? 'phone' : isNumeric ? 'numeric' : 'string',
        });
    });
}

// ===================================================================
// EXAMPLE 13: Integrate with Chat Screen
// ===================================================================
export async function example13_ChatScreenIntegration() {
    // In ChatScreen component
    const routePhoneNumber = '+254712345678';

    // Load conversation
    const thread = await getThreadDetails(routePhoneNumber);

    // Display messages
    console.log('Showing', thread.messages.length, 'messages');
    console.log('Last message:', thread.lastMessage);

    // Mark as read when user opens chat
    await markThreadRead(routePhoneNumber);
}

// ===================================================================
// EXAMPLE 14: Send message with proper thread ID
// ===================================================================
export async function example14_SendMessage() {
    const phoneNumber = '+254712345678';
    const messageBody = 'Hello!';

    // Thread ID can be phone number or numeric ID
    const messageId = await addMessage(
        phoneNumber,           // address
        messageBody,           // body
        'outgoing',            // type
        'sent',                // status
        Date.now(),            // timestamp
        phoneNumber            // threadId (now accepts string or number)
    );

    console.log('Message sent:', messageId);
}

// ===================================================================
// EXAMPLE 15: Error handling patterns
// ===================================================================
export async function example15_ErrorHandling() {
    const threadId = getUserProvidedThreadId();

    // Pattern 1: Try-catch with strict validation
    try {
        const normalized = normalizeThreadId(threadId);
        const thread = await getThreadDetails(normalized);
        console.log('Success:', thread);
    } catch (error) {
        console.error('Invalid thread ID');
    }

    // Pattern 2: Conditional validation
    if (isValidThreadId(threadId)) {
        const thread = await getThreadDetails(threadId);
        console.log('Success:', thread);
    } else {
        console.error('Invalid thread ID');
    }

    // Pattern 3: Safe with fallback
    const cleanedId = toThreadId(threadId, 'default-thread');
    const thread = await getThreadDetails(cleanedId);
    console.log('Thread (with fallback):', thread);
}

// ===================================================================
// Helper function (not real implementation)
// ===================================================================
function getUserInput(): any {
    // Mock function
    return '+254712345678';
}

function getUserProvidedThreadId(): any {
    // Mock function
    return '+254712345678';
}

export {};
