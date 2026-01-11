// -------------------------------------------------------------
// 📨 BulkSmsService - Business Logic for Bulk SMS Operations
// -------------------------------------------------------------
// Extracted from useBulkPro hook for better separation of concerns

import { Recipient } from '@/types/bulkSms';
import { insertMessage, updateMessageStatus } from '@/db/messaging';
import { UnifiedMessageManager } from '@/services/unifiedMessageService';
import { PermissionsAndroid, Platform } from 'react-native';

export interface SendConfig {
    sendSpeed: number; // milliseconds between messages
    abortSignal?: AbortSignal;
}

export interface SendProgress {
    sent: number;
    failed: number;
    total: number;
    currentRecipient?: Recipient;
}

export class BulkSmsService {
    /**
     * Format message template with recipient data
     * Supports dynamic placeholders: {name}, {phone}, {amount}, {any_field}
     */
    formatMessage(template: string, recipient: Recipient): string {
        let result = template;

        // Built-in placeholders
        result = result.replace(/{name}/gi, recipient.name || '');
        result = result.replace(/{phone}/gi, recipient.phone || '');
        result = result.replace(/{amount}/gi, String(recipient.amount || ''));

        // Dynamic placeholders from recipient.fields
        if (recipient.fields) {
            Object.entries(recipient.fields).forEach(([key, value]) => {
                const placeholder = new RegExp(`{${key}}`, 'gi');
                result = result.replace(placeholder, String(value || ''));
            });
        }

        return result;
    }

    /**
     * Normalize phone number to E.164 format
     */
    normalizePhone(phone: string): string {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // Handle Kenyan numbers
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        } else if (cleaned.startsWith('254')) {
            // Already in correct format
        } else if (cleaned.startsWith('+254')) {
            cleaned = cleaned.slice(1);
        }

        // Add + prefix
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    }

    /**
     * Remove duplicate recipients by phone number
     */
    deduplicateRecipients(recipients: Recipient[]): Recipient[] {
        const seen = new Set<string>();
        return recipients.filter(r => {
            const normalized = this.normalizePhone(r.phone);
            if (seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
    }

    /**
     * Send bulk messages with progress tracking
     * Returns async generator for real-time progress updates
     */
    async *sendBulk(
        recipients: Recipient[],
        template: string,
        config: SendConfig
    ): AsyncGenerator<SendProgress> {
        // Check SMS permissions
        const hasSendPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.SEND_SMS
        );
        const hasDeliveryPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
        );
        
        if (!hasSendPermission) {
            throw new Error('SEND_SMS permission required');
        }

        if (!hasDeliveryPermission) {
            console.warn('Delivery tracking disabled - RECEIVE_SMS permission missing');
        }

        const isDefault = await UnifiedMessageManager.isDefault?.();
        if (!isDefault && Platform.OS === 'android') {
            console.warn('Delivery reports may be unreliable - app is not default SMS handler');
        }

        const total = recipients.length;
        let sent = 0;
        let failed = 0;

        for (const recipient of recipients) {
            // Check for abort
            if (config.abortSignal?.aborted) {
                break;
            }

            try {
                const message = this.formatMessage(template, recipient);
                const normalizedPhone = this.normalizePhone(recipient.phone);

                // Insert to database first (write-first pattern)
                const dbMessage = await insertMessage(
                    -1, // No conversation ID for bulk
                    normalizedPhone,
                    message,
                    'outgoing',
                    'pending'
                );

                // Send via native SMS
                const response = await UnifiedMessageManager.sendMessage({
                    address: normalizedPhone,
                    body: message,
                });

                // Update status
                if (response.success) {
                    await updateMessageStatus(dbMessage.id, 'sent');
                    sent++;
                } else {
                    await updateMessageStatus(dbMessage.id, 'failed');
                    failed++;
                }

                // Yield progress
                yield {
                    sent,
                    failed,
                    total,
                    currentRecipient: recipient,
                };

                // Wait before next message
                if (sent + failed < total) {
                    await this.delay(config.sendSpeed);
                }
            } catch (error) {
                console.error('[BulkSmsService] Send failed:', error);
                failed++;

                yield {
                    sent,
                    failed,
                    total,
                    currentRecipient: recipient,
                };
            }
        }

        // Final progress
        yield {
            sent,
            failed,
            total,
        };
    }

    /**
     * Validate message body
     */
    validateMessage(body: string): {
        valid: boolean;
        length: number;
        smsCount: number;
        error?: string;
    } {
        if (!body || !body.trim()) {
            return {
                valid: false,
                length: 0,
                smsCount: 0,
                error: 'Message cannot be empty',
            };
        }

        const length = body.length;
        const MAX_LENGTH = 1600; // 10 SMS parts

        if (length > MAX_LENGTH) {
            return {
                valid: false,
                length,
                smsCount: Math.ceil(length / 160),
                error: `Message too long (${length} chars). Max ${MAX_LENGTH} chars.`,
            };
        }

        // Calculate SMS count (160 chars per SMS for GSM-7, 70 for UCS-2)
        const smsCount = Math.ceil(length / 160);

        return {
            valid: true,
            length,
            smsCount,
        };
    }

    /**
     * Estimate send time
     */
    estimateSendTime(recipientCount: number, sendSpeed: number): {
        milliseconds: number;
        minutes: number;
        formatted: string;
    } {
        const milliseconds = recipientCount * sendSpeed;
        const minutes = Math.ceil(milliseconds / 60000);

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        const formatted = hours > 0
            ? `~${hours}h ${mins}m`
            : `~${mins} minute${mins > 1 ? 's' : ''}`;

        return {
            milliseconds,
            minutes,
            formatted,
        };
    }

    /**
     * Utility: Delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
export const bulkSmsService = new BulkSmsService();
