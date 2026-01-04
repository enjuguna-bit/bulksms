import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
interface Conversation {
  id: number;
  recipientName: string;
  recipientPhone: string;
  lastMessageAt: number;
  unreadCount: number;
  snippet: string;
}

interface Message {
  id: number;
  conversationId: number;
  body: string;
  type: 'incoming' | 'outgoing' | 'pending';
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  timestamp: number;
}

interface MessagingState {
  // Core data
  threads: Conversation[];
  currentMessages: Message[];

  // UI state
  loading: boolean;
  unreadCount: number;
  canReceiveSms: boolean;

  // Buffer diagnostics
  bufferStats: {
    pending: number;
    oldest: number | null;
  };
  bufferError: string | null;
}

interface MessagingActions {
  // Data actions
  setThreads: (threads: Conversation[]) => void;
  addThread: (thread: Conversation) => void;
  updateThread: (threadId: number, updates: Partial<Conversation>) => void;
  removeThread: (threadId: number) => void;

  setCurrentMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: number, updates: Partial<Message>) => void;

  // UI actions
  setLoading: (loading: boolean) => void;
  setUnreadCount: (count: number) => void;
  setCanReceiveSms: (canReceive: boolean) => void;

  // Buffer actions
  setBufferStats: (stats: MessagingState['bufferStats']) => void;
  setBufferError: (error: string | null) => void;

  // Operations
  refreshThreads: () => Promise<void>;
  loadMoreThreads: () => Promise<void>;
  getThreadMessages: (conversationId: number) => Promise<Message[]>;
  markThreadRead: (conversationId: number) => Promise<void>;
  sendMessage: (params: {
    address: string;
    body: string;
    type: 'incoming' | 'outgoing' | 'mms'
  }) => Promise<void>;
}

/**
 * Optimized Zustand store for messaging state management
 * Replaces the complex MessageProvider with better performance and maintainability
 */
export const useMessagingStore = create<MessagingState & MessagingActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    threads: [],
    currentMessages: [],
    loading: true,
    unreadCount: 0,
    canReceiveSms: true,
    bufferStats: {
      pending: 0,
      oldest: null,
    },
    bufferError: null,

    // Data actions
    setThreads: (threads: Conversation[]) => set({ threads }),

    addThread: (thread: Conversation) => set((state: MessagingState) => ({
      threads: [thread, ...state.threads.filter((t: Conversation) => t.id !== thread.id)]
    })),

    updateThread: (threadId: number, updates: Partial<Conversation>) => set((state: MessagingState) => ({
      threads: state.threads.map((thread: Conversation) =>
        thread.id === threadId ? { ...thread, ...updates } : thread
      )
    })),

    removeThread: (threadId: number) => set((state: MessagingState) => ({
      threads: state.threads.filter((thread: Conversation) => thread.id !== threadId)
    })),

    setCurrentMessages: (currentMessages: Message[]) => set({ currentMessages }),

    addMessage: (message: Message) => set((state: MessagingState) => ({
      currentMessages: [...state.currentMessages, message]
    })),

    updateMessage: (messageId: number, updates: Partial<Message>) => set((state: MessagingState) => ({
      currentMessages: state.currentMessages.map((msg: Message) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    })),

    // UI actions
    setLoading: (loading: boolean) => set({ loading }),

    setUnreadCount: (unreadCount: number) => set({ unreadCount }),

    setCanReceiveSms: (canReceiveSms: boolean) => set({ canReceiveSms }),

    // Buffer actions
    setBufferStats: (bufferStats: MessagingState['bufferStats']) => set({ bufferStats }),

    setBufferError: (bufferError: string | null) => set({ bufferError }),

    // Async operations (implementations would call actual services)
    refreshThreads: async () => {
      set({ loading: true });
      try {
        // Implementation would call actual database/service functions
        // const conversations = await getConversations('all', 'recent');
        // const count = await getTotalUnreadCount();
        // set({ threads: conversations, unreadCount: count });

        // Placeholder for now
        console.log('Refreshing threads...');
      } catch (error) {
        console.error('Failed to refresh threads:', error);
      } finally {
        set({ loading: false });
      }
    },

    loadMoreThreads: async () => {
      // Implementation for pagination
      console.log('Loading more threads...');
    },

    getThreadMessages: async (conversationId: number) => {
      try {
        // Implementation would call getMessages(conversationId, 100)
        // const messages = await getMessages(conversationId, 100);
        // set({ currentMessages: messages });
        // return messages;

        // Placeholder
        return [];
      } catch (error) {
        console.error('Failed to get thread messages:', error);
        return [];
      }
    },

    markThreadRead: async (conversationId: number) => {
      try {
        // Implementation would call markConversationAsRead(conversationId)
        // await markConversationAsRead(conversationId);

        // Update local state
        get().updateThread(conversationId, { unreadCount: 0 });
        set((state: MessagingState) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));

        console.log('Marked thread as read:', conversationId);
      } catch (error) {
        console.error('Failed to mark thread read:', error);
        throw error;
      }
    },

    sendMessage: async (params: { address: string; body: string; type: 'incoming' | 'outgoing' | 'mms' }) => {
      try {
        // Implementation would call send message functions
        // const conversation = await getOrCreateConversation(params.address);
        // await insertMessage(...);

        // Optimistically update UI
        const tempMessage: Message = {
          id: Date.now(), // Temporary ID
          conversationId: 0, // Would be set properly
          body: params.body,
          type: params.type === 'incoming' ? 'incoming' : 'outgoing',
          status: 'pending',
          timestamp: Date.now(),
        };

        get().addMessage(tempMessage);
        await get().refreshThreads();

        console.log('Message sent:', params);
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
  }))
);

// Optimized selectors for minimal re-renders
export const useThreads = () => useMessagingStore((state: MessagingState) => state.threads);
export const useCurrentMessages = () => useMessagingStore((state: MessagingState) => state.currentMessages);
export const useMessagingUI = () => useMessagingStore((state: MessagingState) => ({
  loading: state.loading,
  unreadCount: state.unreadCount,
  canReceiveSms: state.canReceiveSms,
}));
export const useBufferStats = () => useMessagingStore((state: MessagingState) => ({
  bufferStats: state.bufferStats,
  bufferError: state.bufferError,
}));

// Actions selectors
export const useMessagingActions = () => useMessagingStore((state: MessagingActions) => ({
  refreshThreads: state.refreshThreads,
  loadMoreThreads: state.loadMoreThreads,
  getThreadMessages: state.getThreadMessages,
  markThreadRead: state.markThreadRead,
  sendMessage: state.sendMessage,
}));
