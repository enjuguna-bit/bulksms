// src/providers/MessageProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { InteractionManager, Alert, AppState } from 'react-native';

// ⚡ New messaging schema imports
import {
  Conversation,
  Message,
  getConversations,
  getMessages,
  getOrCreateConversation,
  insertMessage,
  markConversationAsRead,
  getTotalUnreadCount,
  initMessagingSchema,
  syncMessageFromNative,
} from '@/db/messaging';
import { addSmsReceivedListener } from '@/native';
import {
  bufferIncomingSms,
  processBufferedMessages,
  getBufferStats,
  scheduleBufferProcessing,
} from "@/services/incomingSmsProcessor";
import { ComplianceService } from '@/services/ComplianceService';
import { InboxScannerService } from '@/services/InboxScannerService';
import Logger from '@/utils/logger';
import { checkSmsAndContactPermissionsDetailed } from '@/utils/requestPermissions';
import { messageEvents } from '@/services/MessageEventEmitter';
import { notificationRateLimiter } from '@/services/NotificationRateLimiter';
import { localNotificationService } from '@/services/LocalNotificationService';
import { systemNotificationService } from '@/services/SystemNotificationService';
import { notificationPreferences } from '@/services/NotificationPreferences';
import { useToast } from '@/components/ui';
import { useNavigation } from '@react-navigation/native';

interface MessageContextType {
  threads: Conversation[];
  loading: boolean;
  unreadCount: number;
  refreshThreads: () => Promise<void>;
  loadMoreThreads: () => Promise<void>;
  sendMessage: (params: { address: string; body: string; type: 'incoming' | 'outgoing' | 'mms' }) => Promise<void>;
  getThreadMessages: (conversationId: number) => Promise<Message[]>;
  markThreadRead: (conversationId: number) => Promise<void>;
  canReceiveSms: boolean;
  bufferStats: { pending: number; oldest: number | null };
  bufferError: string | null;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [canReceiveSms, setCanReceiveSms] = useState(true);
  const [bufferStats, setBufferStats] = useState<{ pending: number; oldest: number | null }>({
    pending: 0,
    oldest: null,
  });
  const [bufferError, setBufferError] = useState<string | null>(null);

  const loadThreads = useCallback(async (showLoading = false, retryCount = 0) => {
    try {
      if (showLoading) setIsLoading(true);
      await initMessagingSchema();
      const conversations = await getConversations('all', 'recent');
      setThreads(conversations);
    } catch (e) {
      Logger.error('MessageProvider', 'Failed to load threads', e);

      // Retry logic: if this is first attempt and failed (likely DB init race), retry once
      if (retryCount === 0) {
        Logger.info('MessageProvider', 'Retrying thread load after init failure...');
        setTimeout(() => loadThreads(false, 1), 1000);
      } else {
        setThreads([]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const count = await getTotalUnreadCount();
    setUnreadCount(count);
  }, []);

  const refreshThreads = useCallback(async () => {
    await loadThreads(false);
    await refreshUnreadCount();
  }, [loadThreads, refreshUnreadCount]);

  const loadMoreThreads = useCallback(async () => {
    // New schema loads all at once, pagination can be added later
    await loadThreads(false);
  }, [loadThreads]);

  const sendMessage = useCallback(async (params: { address: string; body: string; type: 'incoming' | 'outgoing' | 'mms' }) => {
    const conversation = await getOrCreateConversation(params.address);
    await insertMessage(
      conversation.id,
      params.address,
      params.body,
      params.type === 'incoming' ? 'incoming' : 'outgoing',
      params.type === 'incoming' ? 'received' : 'sent'
    );
    await refreshThreads();
  }, [refreshThreads]);

  const getThreadMessages = useCallback(async (conversationId: number): Promise<Message[]> => {
    return getMessages(conversationId, 100);
  }, []);

  const markThreadRead = useCallback(async (conversationId: number) => {
    await markConversationAsRead(conversationId);
    await refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    // Check RECEIVE_SMS permission on mount
    checkSmsAndContactPermissionsDetailed().then(permissions => {
      setCanReceiveSms(permissions.RECEIVE_SMS);
      if (!permissions.RECEIVE_SMS) {
        Logger.warn('MessageProvider', 'RECEIVE_SMS denied - real-time message detection disabled');
      }
    });

    // Defer loading until after navigation transition for smoothness
    InteractionManager.runAfterInteractions(async () => {
      await loadThreads(true);
      await refreshUnreadCount();
    });
  }, [loadThreads, refreshUnreadCount]);

  // ⚡ Real-time SMS listener for incoming messages (only if RECEIVE_SMS granted)
  useEffect(() => {
    if (!canReceiveSms) {
      Logger.info('MessageProvider', 'Skipping SMS listener setup - RECEIVE_SMS permission not granted');
      return;
    }

    const subscription = addSmsReceivedListener(async (payload) => {
      try {
        if (!payload || !payload.phone || !payload.body) {
          Logger.warn('MessageProvider', 'Invalid SMS payload received', payload);
          return;
        }

        Logger.info('MessageProvider', `Received SMS from ${payload.phone}`);

        // 🛡️ Compliance: Check for opt-out keywords
        await ComplianceService.processIncomingMessage(payload.phone, payload.body);

        // 💰 Inbox Scanner: Check for financial transactions
        // We do this non-blocking to not delay UI updates
        InboxScannerService.processRealTimeMessage(payload.body, payload.phone, payload.timestamp).catch(e => {
          Logger.error('MessageProvider', 'Real-time scan failed', e);
        });

        // ⚡ FIX: Buffer first to prevent duplication/loss and unified with scheduler
        await bufferIncomingSms(payload.body, payload.phone);

        // Trigger processing immediately for responsiveness
        await processBufferedMessages();

        // Refresh threads to show new message
        await refreshThreads();

        // 🔔 Emit event for notification services
        try {
          const conversation = await getOrCreateConversation(payload.phone);
          const messages = await getMessages(conversation.id, 1);

          if (messages.length > 0) {
            messageEvents.emit({
              message: messages[0],
              conversationId: conversation.id,
              address: payload.phone,
              displayName: conversation.recipientName,
              timestamp: Date.now(),
            });
          }
        } catch (eventError) {
          Logger.error('MessageProvider', 'Failed to emit message event', eventError);
        }
      } catch (error) {
        Logger.error('MessageProvider', 'Failed to process incoming SMS', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [canReceiveSms, refreshThreads]);

  // 🔁 Ensure buffered messages are processed even if listener misses events
  useEffect(() => {
    const stopScheduler = scheduleBufferProcessing(8000);
    return () => {
      stopScheduler?.();
    };
  }, []);

  // 📊 Observe buffer health for diagnostics and warn when backlog grows
  useEffect(() => {
    let mounted = true;

    const pollStats = async () => {
      try {
        const stats = await getBufferStats();
        if (!mounted) return;

        setBufferStats(stats);
        setBufferError(null);

        if (stats.pending > 50) {
          Logger.warn(
            'MessageProvider',
            `Incoming SMS buffer backlog detected (pending=${stats.pending}, oldest=${stats.oldest})`
          );
        }
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unknown buffer stats error';
        setBufferError(message);
        Logger.error('MessageProvider', 'Failed to read buffer stats', error);
      }
    };

    pollStats();
    const interval = setInterval(pollStats, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // 🔔 Notification System Integration
  const toast = useToast();
  const navigation = useNavigation();

  useEffect(() => {
    // Initialize notification services
    localNotificationService.setToast((config) => {
      const message = config.text2 ? `${config.text1}: ${config.text2}` : config.text1;
      toast.showInfo(message, config.visibilityTime);
    });
    localNotificationService.setNavigation(navigation);

    // Initialize system notifications
    systemNotificationService.initialize();
    systemNotificationService.setNavigationHandler((conversationId, address) => {
      // Navigate to conversation when notification is tapped
      try {
        // @ts-ignore - navigation type mismatch
        navigation.navigate('Conversation', { conversationId, address });
      } catch (error) {
        console.error('[MessageProvider] Failed to navigate from notification:', error);
      }
    });

    notificationPreferences.load();

    // Subscribe to message events and pass to rate limiter
    const unsubscribeMessageEvents = messageEvents.subscribe((data) => {
      notificationRateLimiter.addMessage(data);
    });

    // Subscribe to batched notifications and show them
    const unsubscribeBatch = notificationRateLimiter.subscribe((batchData) => {
      // Check user preferences
      if (!notificationPreferences.shouldNotify()) {
        return;
      }

      // Always show overlay notification for incoming messages (displays over other apps)
      systemNotificationService.showOverlayNotification({
        conversationId: batchData.conversationId,
        address: batchData.address,
        displayName: batchData.displayName,
        message: batchData.latestMessage,
        count: batchData.count,
      });

      // Only show in-app notifications when app is active
      const appState = AppState.currentState;
      if (appState === 'active') {
        localNotificationService.showInAppNotification({
          conversationId: batchData.conversationId,
          address: batchData.address,
          displayName: batchData.displayName,
          message: batchData.latestMessage,
          count: batchData.count,
        });
      } else {
        // Show system notification when backgrounded (fallback)
        systemNotificationService.showNotification({
          conversationId: batchData.conversationId,
          address: batchData.address,
          displayName: batchData.displayName,
          message: batchData.latestMessage,
          count: batchData.count,
        });
      }
    });

    return () => {
      unsubscribeMessageEvents();
      unsubscribeBatch();
    };
  }, [toast, navigation]);

  return (
    <MessageContext.Provider value={{
      threads,
      loading: isLoading,
      unreadCount,
      refreshThreads,
      loadMoreThreads,
      sendMessage,
      getThreadMessages,
      markThreadRead,
      canReceiveSms,
      bufferStats,
      bufferError,
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