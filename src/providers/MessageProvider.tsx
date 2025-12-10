// src/providers/MessageProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { InteractionManager, Alert } from 'react-native';

// ⚡ FIX: Import from new structure
import { getThreadsList, getThreadDetails, type MessageThread } from '@/db/repositories/threads';
import { addMessage, markThreadRead as dbMarkRead, getUnreadByThread } from '@/db/repositories/messages';
import { performInitialSyncIfNeeded, getExistingMessageCount, checkSmsSyncPermissions } from '@/services/smsSync';

interface MessageContextType {
  threads: MessageThread[];
  loading: boolean;
  unreadByThread: Record<string, number>;
  refreshThreads: () => Promise<void>;
  loadMoreThreads: () => Promise<void>;
  sendMessage: (params: { address: string; body: string; type: 'incoming' | 'outgoing' | 'mms'; threadId?: number | string }) => Promise<void>;
  getThreadMessages: (threadId: number | string) => Promise<MessageThread>;
  markThreadRead: (threadId: number | string) => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const loadThreads = useCallback(async (reset = false) => {
    try {
      if (reset) setIsLoading(true);

      const currentOffset = reset ? 0 : offset;
      // NOTE: getThreadsList fetches recent 1000 messages and groups them. 
      // It does not currently support usage of offset for pagination of threads directly in DB.
      const fetched = await getThreadsList(LIMIT, currentOffset);

      if (reset) {
        setThreads(fetched);
        setOffset(LIMIT);
      } else {
        setThreads(prev => [...prev, ...fetched]);
        setOffset(prev => prev + LIMIT);
      }
    } catch (e) {
      console.error("Failed to load threads", e);
      // Set empty array instead of crashing
      if (reset) {
        setThreads([]);
        setOffset(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  const refreshUnreadCounts = async () => {
    const unread = await getUnreadByThread();
    setUnreadByThread(unread);
  };

  const refreshThreads = async () => {
    await loadThreads(true);
    await refreshUnreadCounts();
  };

  const loadMoreThreads = async () => {
    await loadThreads(false);
  };

  const sendMessage = async (params: { address: string; body: string; type: 'incoming' | 'outgoing' | 'mms'; threadId?: number | string }) => {
    await addMessage(params.address, params.body, params.type, 'sent', Date.now(), String(params.threadId ?? params.address));
    await refreshThreads();
  };

  const getThreadMessages = async (threadId: number | string): Promise<MessageThread> => {
    return getThreadDetails(String(threadId));
  };

  const markThreadRead = async (threadId: number | string) => {
    await dbMarkRead(String(threadId));
    await refreshUnreadCounts();
  };

  useEffect(() => {
    // Defer loading until after navigation transition for smoothness
    InteractionManager.runAfterInteractions(async () => {
      // Check if we need to perform initial SMS sync
      try {
        const hasPermissions = await checkSmsSyncPermissions();
        if (hasPermissions) {
          const existingCount = await getExistingMessageCount();
          if (existingCount > 0) {
            const syncResult = await performInitialSyncIfNeeded();
            if (syncResult.synced && syncResult.imported > 0) {
              console.log(`MessageProvider: Imported ${syncResult.imported} existing messages`);
            }
          }
        }
      } catch (error) {
        console.warn('MessageProvider: Initial sync failed', error);
      }

      // Load threads after sync attempt
      loadThreads(true);
      refreshUnreadCounts();
    });
  }, []);

  return (
    <MessageContext.Provider value={{
      threads,
      loading: isLoading, // Alias for compatibility
      unreadByThread,
      refreshThreads,
      loadMoreThreads,
      sendMessage,
      getThreadMessages,
      markThreadRead
    }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) throw new Error("useMessageContext must be used within MessageProvider");
  return context;
};

export const useMessages = useMessageContext;