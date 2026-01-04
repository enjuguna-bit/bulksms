// -------------------------------------------------------------
// 🧪 BulkSmsService Tests
// -------------------------------------------------------------

import { BulkSmsService } from '../BulkSmsService';
import { Recipient } from '@/types/bulkSms';

describe('BulkSmsService', () => {
    let service: BulkSmsService;

    beforeEach(() => {
        service = new BulkSmsService();
    });

    describe('formatMessage', () => {
        it('should replace built-in placeholders', () => {
            const template = 'Hello {name}, your balance is KSH {amount}. Contact: {phone}';
            const recipient: Recipient = {
                name: 'John Doe',
                phone: '+254700123456',
                amount: 1500,
            };

            const result = service.formatMessage(template, recipient);

            expect(result).toBe('Hello John Doe, your balance is KSH 1500. Contact: +254700123456');
        });

        it('should handle missing fields gracefully', () => {
            const template = 'Hello {name}, {missingField}';
            const recipient: Recipient = {
                name: 'Jane',
                phone: '+254700123456',
            };

            const result = service.formatMessage(template, recipient);

            expect(result).toBe('Hello Jane, {missingField}'); // Unknown placeholders left as-is
        });

        it('should replace dynamic fields from recipient.fields', () => {
            const template = 'Hello {name}, your {custom_field} is ready';
            const recipient: Recipient = {
                name: 'John',
                phone: '+254700123456',
                fields: {
                    custom_field: 'order',
                },
            };

            const result = service.formatMessage(template, recipient);

            expect(result).toBe('Hello John, your order is ready');
        });

        it('should be case-insensitive for placeholders', () => {
            const template = 'Hello {NAME}, {Phone}';
            const recipient: Recipient = {
                name: 'John',
                phone: '+254700123456',
            };

            const result = service.formatMessage(template, recipient);

            expect(result).toBe('Hello John, +254700123456');
        });
    });

    describe('normalizePhone', () => {
        it('should convert 0XXX to +254XXX', () => {
            expect(service.normalizePhone('0700123456')).toBe('+254700123456');
        });

        it('should handle numbers already starting with 254', () => {
            expect(service.normalizePhone('254700123456')).toBe('+254700123456');
        });

        it('should handle numbers with +254 prefix', () => {
            expect(service.normalizePhone('+254700123456')).toBe('+254700123456');
        });

        it('should remove non-digit characters', () => {
            expect(service.normalizePhone('+254-700-123-456')).toBe('+254700123456');
            expect(service.normalizePhone('(254) 700 123 456')).toBe('+254700123456');
        });
    });

    describe('deduplicateRecipients', () => {
        it('should remove duplicate phone numbers', () => {
            const recipients: Recipient[] = [
                { name: 'John', phone: '0700123456' },
                { name: 'Jane', phone: '+254700123456' }, // Duplicate
                { name: 'Bob', phone: '0700123457' },
            ];

            const result = service.deduplicateRecipients(recipients);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('John');
            expect(result[1].name).toBe('Bob');
        });

        it('should keep first occurrence of duplicate', () => {
            const recipients: Recipient[] = [
                { name: 'John', phone: '0700123456', amount: 100 },
                { name: 'John Duplicate', phone: '0700123456', amount: 200 },
            ];

            const result = service.deduplicateRecipients(recipients);

            expect(result).toHaveLength(1);
            expect(result[0].amount).toBe(100); // First one kept
        });
    });

    describe('validateMessage', () => {
        it('should validate non-empty message', () => {
            const result = service.validateMessage('Hello world');

            expect(result.valid).toBe(true);
            expect(result.length).toBe(11);
            expect(result.smsCount).toBe(1);
            expect(result.error).toBeUndefined();
        });

        it('should reject empty message', () => {
            const result = service.validateMessage('');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Message cannot be empty');
        });

        it('should calculate SMS count correctly', () => {
            const message = 'A'.repeat(320); // 2 SMS
            const result = service.validateMessage(message);

            expect(result.smsCount).toBe(2);
        });

        it('should reject messages over 1600 chars', () => {
            const message = 'A'.repeat(1601);
            const result = service.validateMessage(message);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Message too long');
        });
    });

    describe('estimateSendTime', () => {
        it('should estimate time for small batch', () => {
            const result = service.estimateSendTime(10, 1000); // 10 recipients, 1s each

            expect(result.milliseconds).toBe(10000);
            expect(result.minutes).toBe(1);
            expect(result.formatted).toBe('~1 minute');
        });

        it('should estimate time for large batch', () => {
            const result = service.estimateSendTime(300, 1000); // 300 recipients, 1s each

            expect(result.minutes).toBe(5);
            expect(result.formatted).toBe('~5 minutes');
        });

        it('should format hours correctly', () => {
            const result = service.estimateSendTime(3600, 1000); // 1 hour

            expect(result.formatted).toBe('~1h 0m');
        });
    });
});
