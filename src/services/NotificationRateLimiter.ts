import type { Message } from '@/db/messaging';
import type { MessageEventData } from './MessageEventEmitter';

interface MessageBatch {
    conversationId: number;
    address: string;
    displayName?: string;
    messages: Message[];
    firstTimestamp: number;
}

type BatchListener = (data: {
    conversationId: number;
    address: string;
    displayName?: string;
    latestMessage: Message;
    count: number;
}) => void;

export class NotificationRateLimiter {
    private batches = new Map<number, MessageBatch>();
    private timers = new Map<number, NodeJS.Timeout>();
    private listeners: Set<BatchListener> = new Set();
    private batchWindow = 3000; // 3 seconds

    subscribe(listener: BatchListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    addMessage(data: MessageEventData): void {
        const { conversationId, message, address, displayName } = data;

        if (!this.batches.has(conversationId)) {
            // Create new batch
            this.batches.set(conversationId, {
                conversationId,
                address,
                displayName,
                messages: [message],
                firstTimestamp: Date.now(),
            });

            // Set timer to flush batch
            const timer = setTimeout(() => {
                this.flushBatch(conversationId);
            }, this.batchWindow);

            this.timers.set(conversationId, timer);
        } else {
            // Add to existing batch
            const batch = this.batches.get(conversationId)!;
            batch.messages.push(message);
        }
    }

    private flushBatch(conversationId: number): void {
        const batch = this.batches.get(conversationId);
        if (!batch) return;

        const messageCount = batch.messages.length;
        const latestMessage = batch.messages[batch.messages.length - 1];

        // Emit to listeners
        this.listeners.forEach(listener => {
            try {
                listener({
                    conversationId: batch.conversationId,
                    address: batch.address,
                    displayName: batch.displayName,
                    latestMessage,
                    count: messageCount,
                });
            } catch (error) {
                console.error('[NotificationRateLimiter] Listener error:', error);
            }
        });

        // Clean up
        this.batches.delete(conversationId);
        const timer = this.timers.get(conversationId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(conversationId);
        }
    }

    clear(): void {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.batches.clear();
        this.listeners.clear();
    }
}

export const notificationRateLimiter = new NotificationRateLimiter();
export default notificationRateLimiter;
