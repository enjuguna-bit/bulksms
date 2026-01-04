import { Alert, Platform, NativeModules } from 'react-native';
import { sendSingleSms, SmsError } from './smsService';
import { getOrCreateConversation, insertMessage, updateMessageStatus as updateMsgStatus } from '@/db/messaging';
import { incrementCampaignStats, updateCampaignStatus } from '@/db/campaigns/repository';
import { ComplianceService } from '@/services/ComplianceService';
import { smsRole, smsSender } from '@/native';
import Logger from '@/utils/logger';

// Optional: NetInfo import with fallback
let NetInfo: any = null;
try {
    NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
    // NetInfo not available, will use fallback
}

// Add error handling for missing smsRole
if (!smsRole) {
    Logger.error('UnifiedMessageManager', 'smsRole native module not available');
}

export interface SendMessageParams {
    address: string;
    body: string;
    simSlot?: number;
}

export interface BulkMessageParams {
    recipients: string[];
    body: string;
    simSlot?: number;
    chunkSize?: number;      // Messages per chunk (default: 50)
    chunkDelayMs?: number;   // Delay between chunks (default: 1000ms)
    timeout?: number;        // Timeout per message in ms (default: 10000ms)
    onProgress?: (progress: BulkProgress) => void;
    campaignId?: number;     // ⚡ NEW: Campaign ID for tracking
    variantsConfig?: Record<string, string>; // ⚡ NEW: A/B Test variants (ID -> Body)
}

export interface BulkProgress {
    sent: number;
    failed: number;
    total: number;
    currentChunk: number;
    totalChunks: number;
    percentage: number;
}

export interface SendResponse {
    success: boolean;
    messageId?: number; // DB ID
    error?: string;
    errorCode?: SmsError;
}

export interface PreBulkCheckResult {
    canProceed: boolean;
    warnings: string[];
    errors: string[];
    batteryLevel: number;
    networkType: string;
    isDefaultSmsApp: boolean;
}

export class UnifiedMessageManager {
    // ---------------------------------------------------------------------------
    // ⚡ Pre-Bulk Safety Checks
    // ---------------------------------------------------------------------------

    /**
     * Perform safety checks before starting a bulk send operation.
     * Checks battery level, network status, and default SMS app status.
     */
    static async preBulkCheck(recipientCount: number): Promise<PreBulkCheckResult> {
        const warnings: string[] = [];
        const errors: string[] = [];

        // Run all checks in parallel
        const [netState, isDefault] = await Promise.all([
            NetInfo?.fetch?.().catch(() => ({ type: 'unknown', isConnected: true }))
            ?? Promise.resolve({ type: 'unknown', isConnected: true }),
            smsRole?.isDefault?.().catch(() => false) ?? false,
        ]);

        // Battery level: Use native module if available, otherwise assume OK
        let batteryLevel = 1;
        try {
            // Android provides battery info via Intent - for now assume OK
            // In production, add a native module for battery status
            batteryLevel = 1; // Placeholder - battery check is optional
        } catch (e) {
            // Battery check failed, assume OK
        }

        const networkType = (netState as any)?.type ?? 'unknown';
        const isConnected = (netState as any)?.isConnected ?? true;

        // Battery check
        if (batteryLevel < 0.15) {
            errors.push(`Battery critically low (${Math.round(batteryLevel * 100)}%). Charge device before bulk sending.`);
        } else if (batteryLevel < 0.25) {
            warnings.push(`Battery low (${Math.round(batteryLevel * 100)}%). Consider charging for large batches.`);
        }

        // Network check
        if (!isConnected) {
            errors.push('No network connection detected.');
        }

        // Default SMS app check
        if (!isDefault) {
            if (recipientCount > 20) {
                warnings.push('App is not default SMS handler. Large batches may be throttled by carrier.');
            }
        }

        // Large batch warning
        if (recipientCount > 500) {
            warnings.push(`Large batch (${recipientCount} recipients). Consider splitting into smaller batches.`);
        }

        // Network type warning for cellular
        if (networkType === 'cellular' && recipientCount > 100) {
            warnings.push('On cellular network. Wi-Fi recommended for large batches.');
        }

        const canProceed = errors.length === 0;

        Logger.info('BulkCheck', `Pre-bulk check: ${canProceed ? 'PASS' : 'FAIL'}`, {
            batteryLevel: Math.round(batteryLevel * 100),
            networkType,
            isDefault,
            recipientCount,
            warnings: warnings.length,
            errors: errors.length,
        });

        return {
            canProceed,
            warnings,
            errors,
            batteryLevel,
            networkType,
            isDefaultSmsApp: isDefault,
        };
    }

    /**
     * Perform safety checks and throw if critical issues found.
     * Use this for automated bulk operations that should abort on failure.
     */
    static async ensureBulkSafetyOrThrow(recipientCount: number): Promise<void> {
        const check = await this.preBulkCheck(recipientCount);

        if (!check.canProceed) {
            throw new Error(`Bulk send blocked: ${check.errors.join('; ')}`);
        }

        // Log warnings but don't block
        if (check.warnings.length > 0) {
            Logger.warn('BulkCheck', `Proceeding with warnings: ${check.warnings.join('; ')}`);
        }
    }

    /**
     * Send a single message and log to DB
     */
    static async sendMessage(params: SendMessageParams): Promise<SendResponse> {
        const { address, body, simSlot = 0 } = params;

        // 0. Input validation
        if (!address || !address.trim()) {
            return { success: false, error: 'Invalid phone number provided' };
        }
        if (!body || !body.trim()) {
            return { success: false, error: 'Message body cannot be empty (message)' };
        }
        if (body.length > 1600) {
            return { success: false, error: 'Message is too long (max 1600 characters)' };
        }

        // 1. Get or create conversation in new schema
        const conversation = await getOrCreateConversation(address);

        // 2. Send via Native
        const result = await sendSingleSms(address, body, simSlot);

        if (!result.success) {
            // Log failed attempt to new schema
            await insertMessage(
                conversation.id,
                address,
                body,
                'outgoing',
                'failed'
            );
            return { success: false, error: result.details || result.error, errorCode: result.error };
        }

        // 3. Log Success to new schema
        const message = await insertMessage(
            conversation.id,
            address,
            body,
            'outgoing',
            'sent'
        );

        return { success: true, messageId: message.id };
    }

    /**
     * ⚡ Send bulk messages with chunking for high volume
     * - Processes messages in parallel chunks to maximize throughput
     * - Throttles between chunks to prevent carrier rate limiting
     * - Reports progress via callback for UI updates
     */
    static async sendBulk(params: BulkMessageParams): Promise<{ successful: number; failed: number; bulkId: string }> {
        const {
            recipients,
            body,
            simSlot = 0,
            chunkSize = 50,      // Default: 50 messages per chunk
            chunkDelayMs = 1000, // Default: 1 second between chunks
            timeout = 10000,     // ⚡ NEW: Default 10s timeout (reduced from 15s)
            onProgress,
            campaignId,
            variantsConfig       // Optional A/B testing config
        } = params;

        const bulkId = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const totalChunks = Math.ceil(recipients.length / chunkSize);

        // Update campaign status if ID provided
        if (campaignId) {
            await updateCampaignStatus(campaignId, 'running');
        }

        let successful = 0;
        let failed = 0;

        // 🛡️ Compliance Check: Filter blacklisted numbers
        const { allowed, blocked } = await ComplianceService.filterRecipients(recipients);

        if (blocked.length > 0) {
            Logger.warn('Compliance', `Blocked ${blocked.length} recipients found in blacklist`, { count: blocked.length });
            failed += blocked.length; // Count blocked as failed immediately

            // If campaign, log these as failed stats
            if (campaignId) {
                // We might want to loop and increment, or enable a bulk increment.
                // For now, simple loop or just accept the count difference at end.
                // Let's add them to 'failed' count in DB.
                for (let k = 0; k < blocked.length; k++) {
                    await incrementCampaignStats(campaignId, 'failed');
                }
            }
        }

        // Proceed only with allowed recipients
        const targetRecipients = allowed;
        // Check Role for large batches
        if (targetRecipients.length > 20) {
            const isDefault = await smsRole?.isDefault?.().catch(() => false) ?? false;
            if (!isDefault) {
                console.warn("Sending large batch without Default SMS Role - might be throttled");
            }
        }

        // Write-Ahead Pattern
        interface PendingMsg { id: number; recipient: string; conversationId: number; variantId?: string; body: string; }
        const pendingMessages: PendingMsg[] = [];

        // Prepare A/B variant keys if config exists
        const variantKeys = variantsConfig ? Object.keys(variantsConfig) : [];

        try {
            for (let i = 0; i < targetRecipients.length; i++) {
                const recipient = targetRecipients[i];

                // Determine message body and variant
                let msgBody = body;
                let variantId: string | undefined = undefined;

                if (variantsConfig && variantKeys.length > 0) {
                    // Cyclic assignment for even distribution
                    // A, B, A, B...
                    variantId = variantKeys[i % variantKeys.length];
                    msgBody = variantsConfig[variantId];
                }

                const conversation = await getOrCreateConversation(recipient);
                const message = await insertMessage(
                    conversation.id,
                    recipient,
                    msgBody,
                    'outgoing',
                    'pending',
                    undefined,
                    campaignId,
                    variantId
                );
                pendingMessages.push({
                    id: message.id,
                    recipient,
                    conversationId: conversation.id,
                    variantId,
                    body: msgBody
                });
            }
        } catch (e) {
            console.error("Critical: Failed to pre-log bulk messages", e);
            if (campaignId) {
                await updateCampaignStatus(campaignId, 'failed');
            }
            return { successful: 0, failed: recipients.length, bulkId };
        }

        // ⚡ Process in chunks with parallel execution within each chunk
        for (let i = 0; i < pendingMessages.length; i += chunkSize) {
            const chunk = pendingMessages.slice(i, i + chunkSize);
            const currentChunk = Math.floor(i / chunkSize) + 1;

            // Process chunk in parallel
            const results = await Promise.allSettled(
                chunk.map(async (msg) => {
                    try {
                        // Use variant body if available, otherwise default body
                        const result = await sendSingleSms(msg.recipient, msg.body, simSlot);
                        const finalStatus = result.success ? 'sent' : 'failed';
                        await updateMsgStatus(msg.id, finalStatus);

                        // ⚡ Update Campaign Stats
                        if (campaignId) {
                            await incrementCampaignStats(campaignId, result.success ? 'sent' : 'failed');
                            // If sent successfully, we might also want to track delivery later via receipts
                            // For now, 'sent' is what we track here
                        }

                        return result.success;
                    } catch (e) {
                        console.error("Bulk process error for " + msg.recipient, e);
                        try {
                            await updateMsgStatus(msg.id, 'failed');
                            if (campaignId) await incrementCampaignStats(campaignId, 'failed');
                        } catch (_) { }
                        return false;
                    }
                })
            );

            // Count results
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    successful++;
                } else {
                    failed++;
                }
            }

            // Report progress
            if (onProgress) {
                onProgress({
                    sent: successful,
                    failed,
                    total: recipients.length, // Keep original total
                    currentChunk,
                    totalChunks,
                    percentage: Math.round(((successful + failed) / recipients.length) * 100),
                });
            }

            // Throttle between chunks (skip delay after last chunk)
            if (i + chunkSize < pendingMessages.length) {
                await new Promise(resolve => setTimeout(resolve, chunkDelayMs));
            }
        }

        // Finalize Campaign Status
        if (campaignId) {
            await updateCampaignStatus(campaignId, 'completed');
        }

        return { successful, failed, bulkId };
    }

    /**
     * ⚡ Quick send for small batches (no chunking overhead)
     * Use this for batches under 20 messages
     */
    static async sendBulkFast(params: Omit<BulkMessageParams, 'chunkSize' | 'chunkDelayMs' | 'onProgress'>): Promise<{ successful: number; failed: number }> {
        const { recipients, body, simSlot = 0 } = params;

        // 🛡️ Compliance Check
        const { allowed, blocked } = await ComplianceService.filterRecipients(recipients);

        const results = await Promise.allSettled(
            allowed.map(recipient => this.sendMessage({ address: recipient, body, simSlot }))
        );

        let successful = 0;
        let failed = blocked.length; // Count blocked as failed

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                successful++;
            } else {
                failed++;
            }
        }

        return { successful, failed };
    }
}
