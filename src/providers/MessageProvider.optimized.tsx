import { useState, useEffect, useCallback, useMemo, createContext } from "react";
import { InteractionManager, Alert, AppState } from "react-native";

// Optimized imports - only what we need
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
} from "@/db/messaging";

// Core services only
import { addSmsReceivedListener } from "@/native";
import { ComplianceService } from "@/services/ComplianceService";
import { InboxScannerService } from "@/services/InboxScannerService";
import Logger from "@/utils/logger";
import { checkSmsAndContactPermissionsDetailed } from "@/utils/requestPermissions";

// Event system
import { messageEvents } from "@/services/MessageEventEmitter";
import { notificationRateLimiter } from "@/services/NotificationRateLimiter";
import { localNotificationService } from "@/services/LocalNotificationService";
import { systemNotificationService } from "@/services/SystemNotificationService";
import { notificationPreferences } from "@/services/NotificationPreferences";

// UI
import { useToast } from "@/components/ui";
import { useNavigation } from "@react-navigation/native";

// Optimized buffer management - moved to separate hook
import { useSmsBufferManager } from "@/hooks/useSmsBufferManager";

// Types
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

export const MessageContext = createContext<MessageContextType | null>(null);

/**
 * OPTIMIZED MessageProvider - Reduced complexity and improved performance
 * - Consolidated useEffects to reduce re-render cascades
 * - Optimized polling with debouncing
 * - Better error handling and cleanup
 * - Separated concerns into focused hooks
 */
export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state - reduced number of state variables
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [canReceiveSms, setCanReceiveSms] = useState(true);

  // Use optimized buffer manager
  const bufferManager = useSmsBufferManager();

  // UI hooks
  const toast = useToast();
  const navigation = useNavigation();

  // Memoized permission check
  const checkPermissions = useCallback(async () => {
    try {
      const permissions = await checkSmsAndContactPermissionsDetailed();
      setCanReceiveSms(permissions.RECEIVE_SMS);
      if (!permissions.RECEIVE_SMS) {
        Logger.warn('MessageProvider', 'RECEIVE_SMS denied - real-time message detection disabled');
      }
      return permissions;
    } catch (error) {
      Logger.error('MessageProvider', 'Permission check failed', error);
      return null;
    }
  }, []);

  // Optimized thread loading with retry logic
  const loadThreads = useCallback(async (showLoading = false, retryCount = 0) => {
    try {
      if (showLoading) setIsLoading(true);

      await initMessagingSchema();
      const conversations = await getConversations('all', 'recent');
      setThreads(conversations);

      // Update unread count in same operation to reduce renders
      const count = await getTotalUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      Logger.error('MessageProvider', 'Failed to load threads', e);

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

  // Consolidated refresh function
  const refreshThreads = useCallback(async () => {
    await loadThreads(false);
  }, [loadThreads]);

  // Load more threads (pagination placeholder)
  const loadMoreThreads = useCallback(async () => {
    await loadThreads(false); // For now, just reload all
  }, [loadThreads]);

  // Send message with error handling
  const sendMessage = useCallback(async (params: { address: string; body: string; type: 'incoming' | 'outgoing' | 'mms' }) => {
    try {
      const conversation = await getOrCreateConversation(params.address);
      await insertMessage(
        conversation.id,
        params.address,
        params.body,
        params.type === 'incoming' ? 'incoming' : 'outgoing',
        params.type === 'incoming' ? 'received' : 'sent'
      );
      await refreshThreads();
    } catch (error) {
      Logger.error('MessageProvider', 'Failed to send message', error);
      throw error; // Re-throw for UI handling
    }
  }, [refreshThreads]);

  // Get thread messages with caching potential
  const getThreadMessages = useCallback(async (conversationId: number): Promise<Message[]> => {
    try {
      return await getMessages(conversationId, 100);
    } catch (error) {
      Logger.error('MessageProvider', 'Failed to get thread messages', error);
      return [];
    }
  }, []);

  // Mark thread as read
  const markThreadRead = useCallback(async (conversationId: number) => {
    try {
      await markConversationAsRead(conversationId);
      // Update local unread count
      const count = await getTotalUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      Logger.error('MessageProvider', 'Failed to mark thread read', error);
      throw error;
    }
  }, []);

  // Single consolidated useEffect for initialization
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Check permissions
        await checkPermissions();

        // Defer loading until after navigation transition for smoothness
        InteractionManager.runAfterInteractions(async () => {
          if (mounted) {
            await loadThreads(true);
          }
        });
      } catch (error) {
        Logger.error('MessageProvider', 'Initialization failed', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => { mounted = false; };
  }, [checkPermissions, loadThreads]);

  // Optimized SMS listener with proper cleanup
  useEffect(() => {
    if (!canReceiveSms) return;

    const subscription = addSmsReceivedListener(async (payload) => {
      try {
        if (!payload?.phone || !payload?.body) {
          Logger.warn('MessageProvider', 'Invalid SMS payload received', payload);
          return;
        }

        Logger.info('MessageProvider', `Received SMS from ${payload.phone}`);

        // Process in parallel for better performance
        const compliancePromise = ComplianceService.processIncomingMessage(payload.phone, payload.body);
        const scannerPromise = InboxScannerService.processRealTimeMessage(payload.body, payload.phone, payload.timestamp)
          .catch(e => Logger.error('MessageProvider', 'Real-time scan failed', e));

        // Wait for compliance check before proceeding
        await compliancePromise;

        // Buffer message for processing
        await bufferManager.bufferIncomingSms(payload.body, payload.phone);

        // NOTE: Removed immediate processing - background scheduler handles this automatically
        // to prevent duplicate message insertion

        // Refresh threads to show new message (buffered messages will appear when processed)
        await refreshThreads();

        // Emit event for notifications (non-blocking)
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
        };

        // Allow scanner to run in background
        scannerPromise;

      } catch (error) {
        Logger.error('MessageProvider', 'Failed to process incoming SMS', error);
      }
    });

    return () => subscription.remove();
  }, [canReceiveSms, refreshThreads, bufferManager]);

  // Single notification setup effect
  useEffect(() => {
    // Initialize notification services
    localNotificationService.setToast((config) => {
      const message = config.text2 ? `${config.text1}: ${config.text2}` : config.text1;
      toast.showInfo(message, config.visibilityTime);
    });

    systemNotificationService.initialize();

    systemNotificationService.setNavigationHandler((conversationId, address) => {
      try {
        // @ts-ignore - navigation type mismatch
        navigation.navigate('Conversation', { conversationId, address });
      } catch (error) {
        console.error('[MessageProvider] Failed to navigate from notification:', error);
      }
    });

    notificationPreferences.load();

    // Subscribe to message events
    const unsubscribeMessageEvents = messageEvents.subscribe((data) => {
      notificationRateLimiter.addMessage(data);
    });

    // Subscribe to batched notifications
    const unsubscribeBatch = notificationRateLimiter.subscribe((batchData) => {
      if (!notificationPreferences.shouldNotify()) return;

      // Show overlay notification for incoming messages
      systemNotificationService.showOverlayNotification({
        conversationId: batchData.conversationId,
        address: batchData.address,
        displayName: batchData.displayName,
        message: batchData.latestMessage,
        count: batchData.count,
      });

      // Show in-app notification when app is active
      if (AppState.currentState === 'active') {
        localNotificationService.showInAppNotification({
          conversationId: batchData.conversationId,
          address: batchData.address,
          displayName: batchData.displayName,
          message: batchData.latestMessage,
          count: batchData.count,
        });
      } else {
        // Fallback system notification
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

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    threads,
    loading: isLoading,
    unreadCount,
    refreshThreads,
    loadMoreThreads,
    sendMessage,
    getThreadMessages,
    markThreadRead,
    canReceiveSms,
    bufferStats: bufferManager.bufferStats,
    bufferError: bufferManager.bufferError,
  }), [
    threads,
    isLoading,
    unreadCount,
    refreshThreads,
    loadMoreThreads,
    sendMessage,
    getThreadMessages,
    markThreadRead,
    canReceiveSms,
    bufferManager.bufferStats,
    bufferManager.bufferError,
  ]);

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};
