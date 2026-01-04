import type { Message } from '@/db/messaging';

export interface MessageEventData {
    message: Message;
    conversationId: number;
    address: string;
    displayName?: string;
    timestamp: number;
}

type MessageEventListener = (data: MessageEventData) => void;

export class MessageEventEmitter {
    private listeners: Set<MessageEventListener> = new Set();

    subscribe(listener: MessageEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit(data: MessageEventData): void {
        this.listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('[MessageEventEmitter] Listener error:', error);
            }
        });
    }

    clear(): void {
        this.listeners.clear();
    }

    get listenerCount(): number {
        return this.listeners.size;
    }
}

export const messageEvents = new MessageEventEmitter();
export default messageEvents;
