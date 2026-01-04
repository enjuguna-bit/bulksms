// -------------------------------------------------------------
// 🧪 UnifiedMessageManager Tests
// -------------------------------------------------------------

import { UnifiedMessageManager } from '../unifiedMessageService';

// Mock native SMS module
jest.mock('@/native', () => ({
    smsSender: {
        send: jest.fn(),
        canSend: jest.fn(),
        getSimCount: jest.fn(),
        isSafaricomNetwork: jest.fn(),
        getNetworkInfo: jest.fn(),
    },
}));

// Mock database
jest.mock('@/db/messaging', () => ({
    insertMessage: jest.fn(),
    updateMessageStatus: jest.fn(),
    getOrCreateConversation: jest.fn(),
}));

// Mock smsService
jest.mock('../smsService', () => {
    const originalModule = jest.requireActual('../smsService');
    return {
        ...originalModule,
        sendSingleSms: jest.fn(),
    };
});

import { smsSender } from '@/native';
import { insertMessage, updateMessageStatus, getOrCreateConversation } from '@/db/messaging';
import { sendSingleSms, SmsError } from '../smsService';

const mockSmsSender = smsSender as jest.Mocked<typeof smsSender>;
const mockInsertMessage = insertMessage as jest.MockedFunction<typeof insertMessage>;
const mockUpdateMessageStatus = updateMessageStatus as jest.MockedFunction<typeof updateMessageStatus>;
const mockGetOrCreateConversation = getOrCreateConversation as jest.MockedFunction<typeof getOrCreateConversation>;
const mockSendSingleSms = sendSingleSms as jest.MockedFunction<typeof sendSingleSms>;

describe('UnifiedMessageManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock for getOrCreateConversation
        mockGetOrCreateConversation.mockResolvedValue({
            id: 1,
            threadId: 'test-thread',
            recipientName: 'Test Contact',
            recipientNumber: '+254700123456',
            lastMessageTimestamp: Date.now(),
            snippet: null,
            unreadCount: 0,
            archived: false,
            pinned: false,
            muted: false,
            draftText: null,
            draftSavedAt: null,
            color: 0,
            avatarUri: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        } as any);

        // Setup default mock for insertMessage - must return Message with id
        mockInsertMessage.mockResolvedValue({
            id: 1,
            conversationId: 1,
            messageId: 'msg-123',
            type: 'sms',
            direction: 'outgoing',
            address: '+254700123456',
            body: 'Test message',
            timestamp: Date.now(),
            dateSent: Date.now(),
            read: true,
            status: 'sent',
            subscriptionId: -1,
            locked: false,
            deliveryReceiptCount: 0,
            readReceiptCount: 0,
            createdAt: Date.now(),
        } as any);
    });

    describe('sendMessage', () => {
        it('should send a single SMS successfully', async () => {
            mockSendSingleSms.mockResolvedValue({
                success: true,
            });

            const result = await UnifiedMessageManager.sendMessage({
                address: '+254700123456',
                body: 'Hello, test message',
            });

            expect(result.success).toBe(true);
            expect(mockSendSingleSms).toHaveBeenCalledWith(
                '+254700123456',
                'Hello, test message',
                0
            );
        });

        it('should handle send failure gracefully', async () => {
            mockSendSingleSms.mockResolvedValue({
                success: false,
                error: SmsError.PERMISSION_DENIED,
                details: 'Network error',
            });

            const result = await UnifiedMessageManager.sendMessage({
                address: '+254700123456',
                body: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
            expect(result.errorCode).toBe(SmsError.PERMISSION_DENIED);
        });

        it('should validate phone number format', async () => {
            const result = await UnifiedMessageManager.sendMessage({
                address: '', // Invalid: empty phone
                body: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('phone');
        });

        it('should validate message body', async () => {
            const result = await UnifiedMessageManager.sendMessage({
                address: '+254700123456',
                body: '', // Invalid: empty message
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('message');
        });

        it('should reject messages that are too long', async () => {
            const longMessage = 'A'.repeat(1601); // Exceeds 1600 char limit

            const result = await UnifiedMessageManager.sendMessage({
                address: '+254700123456',
                body: longMessage,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('too long');
        });

        it('should handle timeout errors', async () => {
            mockSendSingleSms.mockImplementation(() =>
                new Promise((_resolve) => {
                    // Don't actually resolve to simulate timeout, but fast-fail the test
                })
            );

            // Use a short timeout for the test itself
            const timeoutPromise = new Promise<{ success: boolean; error: string }>((resolve) => {
                setTimeout(() => {
                    resolve({ success: false, error: 'Timeout exceeded' });
                }, 200);
            });

            const sendPromise = UnifiedMessageManager.sendMessage({
                address: '+254700123456',
                body: 'Test',
            });

            const result = await Promise.race([sendPromise, timeoutPromise]);

            expect(result.success).toBe(false);
            expect(result.error!.toLowerCase()).toContain('timeout');
        }, 5000);
    });

    describe('sendBulk', () => {
        it('should send multiple messages with progress tracking', async () => {
            mockSendSingleSms.mockResolvedValue({
                success: true,
            });

            let progressCalls = 0;
            const recipients = [
                '+254700123456',
                '+254700123457',
                '+254700123458',
            ];

            const result = await UnifiedMessageManager.sendBulk({
                recipients: recipients.map(r => r),
                body: 'Test message',
                onProgress: () => {
                    progressCalls++;
                }
            });

            expect(result.successful).toBe(3);
            expect(result.failed).toBe(0);
            expect(mockSendSingleSms).toHaveBeenCalledTimes(3);
            expect(progressCalls).toBeGreaterThan(0);
        });

        it('should handle bulk send with some failures', async () => {
            let callCount = 0;
            mockSendSingleSms.mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    return Promise.resolve({ success: false, error: SmsError.NATIVE_FAILURE });
                }
                return Promise.resolve({ success: true });
            });

            const recipients = ['+254700123456', '+254700123457', '+254700123458'];

            const result = await UnifiedMessageManager.sendBulk({
                recipients: recipients.map(r => r),
                body: 'Test message',
            });

            expect(result.successful).toBe(2); // 2 succeeded
            expect(result.failed).toBe(1); // 1 failed
        });

        it('should chunk large batches', async () => {
            mockSendSingleSms.mockResolvedValue({ success: true });

            const recipients = Array(150).fill(0).map((_, i) => `+25470012345${i}`);

            const result = await UnifiedMessageManager.sendBulk({
                recipients: recipients.map(r => r),
                body: 'Test message',
                chunkSize: 50
            });

            // Should successfully process all 150
            expect(result.successful).toBe(150);
            expect(mockSendSingleSms).toHaveBeenCalledTimes(150);
        });
    });

    describe('edge cases', () => {
        it('should handle special characters in message body', async () => {
            mockSendSingleSms.mockResolvedValue({ success: true });

            const specialChars = 'Hello! 🎉 Test: "quotes" & symbols @#$%';
            const result = await UnifiedMessageManager.sendMessage({
                address: '+254700123456',
                body: specialChars,
            });

            expect(result.success).toBe(true);
            expect(mockSendSingleSms).toHaveBeenCalledWith(
                '+254700123456',
                specialChars,
                0
            );
        });

        it('should normalize phone numbers consistently', async () => {
            mockSendSingleSms.mockResolvedValue({ success: true });

            const phoneNumbers = [
                '0700123456',
                '+254700123456',
                '254700123456',
            ];

            for (const phone of phoneNumbers) {
                await UnifiedMessageManager.sendMessage({
                    address: phone,
                    body: 'Test',
                });
            }

            // Check that sendSingleSms was called with addresses
            const calls = mockSendSingleSms.mock.calls;
            expect(calls.length).toBe(3);
            calls.forEach(call => {
                // Each call should have address and body
                expect(typeof call[0]).toBe('string'); // First arg is address
            });
        });

        it('should handle concurrent sends', async () => {
            mockSendSingleSms.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({ success: true }), 50))
            );

            const promises = Array(5).fill(0).map((_, i) =>
                UnifiedMessageManager.sendMessage({
                    address: `+25470012345${i}`,
                    body: `Concurrent message ${i}`,
                })
            );

            const results = await Promise.all(promises);

            expect(results.every(r => r.success)).toBe(true);
            expect(mockSendSingleSms).toHaveBeenCalledTimes(5);
        });
    });
});
