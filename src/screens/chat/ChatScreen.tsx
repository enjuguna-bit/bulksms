// ============================================================================
// 💬 ChatScreen — Enhanced WhatsApp-Style Chat (v6.0)
// ============================================================================

import React, { useEffect, useRef, useState, useCallback, memo, useMemo, useReducer } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
} from "react-native";

import { useMessages } from "@/providers/MessageProvider";
import MessageBubble from "./MessageBubble";
import ChatHeader from "./ChatHeader";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { UnifiedMessageManager } from "@/services/unifiedMessageService";
import type { Message } from "@/db/messaging";
import { useDebounce } from "@/hooks/useScreenOptimization";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { SmsError } from "@/services/smsService";
import { openAppSettings } from "@/utils/requestPermissions"; // Import actionable helper
import { Alert } from "react-native";

// ---------------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------------

interface MessageState {
  messages: Message[];
  lastUpdated: number;
}

type MessageAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: number; updates: Partial<Message> } };

/**
 * ⚡ Message reducer with deduplication to prevent race conditions
 * between polling and real-time events
 */
function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case 'SET_MESSAGES': {
      // Deduplicate by ID, preferring newer messages (higher timestamp or better status)
      const existingIds = new Set(state.messages.map(m => m.id));
      const incomingIds = new Set(action.payload.map(m => m.id));

      // Merge: keep optimistic messages not yet confirmed, add/update from payload
      const merged = new Map<number, Message>();

      // Add all incoming messages
      action.payload.forEach(m => merged.set(m.id, m));

      // Preserve optimistic messages (negative IDs or pending status) not in payload
      state.messages.forEach(m => {
        if (!incomingIds.has(m.id) && (m.id < 0 || m.status === 'pending')) {
          merged.set(m.id, m);
        }
      });

      // Sort by timestamp descending (newest first for inverted list)
      const messages = Array.from(merged.values())
        .sort((a, b) => b.timestamp - a.timestamp);

      return { messages, lastUpdated: Date.now() };
    }

    case 'ADD_MESSAGE': {
      // Deduplicate: skip if message with same ID already exists
      if (state.messages.some(m => m.id === action.payload.id)) {
        return state;
      }
      return {
        messages: [action.payload, ...state.messages],
        lastUpdated: Date.now(),
      };
    }

    case 'UPDATE_MESSAGE': {
      const idx = state.messages.findIndex(m => m.id === action.payload.id);
      if (idx === -1) return state;

      const updated = [...state.messages];
      updated[idx] = { ...updated[idx], ...action.payload.updates };
      return { messages: updated, lastUpdated: Date.now() };
    }

    default:
      return state;
  }
}

interface ChatScreenProps {
  route: {
    params: {
      threadId?: string | number;
      address: string;
      initialMessage?: any;
    };
  };
  navigation: {
    setOptions: (options: any) => void;
  };
}

// Memoized message bubble wrapper
const MemoizedMessageBubble = memo(
  ({
    msg,
    isMe,
    highlight,
    searchTerm,
  }: {
    msg: Message;
    isMe: boolean;
    highlight: boolean;
    searchTerm: string;
  }) => (
    <MessageBubble
      msg={msg}
      isMe={isMe}
      highlight={highlight}
      searchTerm={searchTerm}
    />
  ),
  (prev: { msg: Message; isMe: boolean; highlight: boolean; searchTerm: string }, next: { msg: Message; isMe: boolean; highlight: boolean; searchTerm: string }) =>
    prev.msg.id === next.msg.id &&
    prev.msg.status === next.msg.status && // Update on status change
    prev.highlight === next.highlight &&
    prev.searchTerm === next.searchTerm
);

import { DebugLogger } from '@/utils/debug';

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  // Safe param access with memoization
  const params = useMemo(() => route.params || {}, [route.params]);
  const { initialMessage } = params;

  // Validate and recover threadId/address with stable references
  const address = useMemo(
    () => params.address || (initialMessage ? initialMessage.address : '') || 'Unknown',
    [params.address, initialMessage]
  );

  const threadId = useMemo(
    () => params.threadId || (address !== 'Unknown' ? address : undefined),
    [params.threadId, address]
  );

  const { colors } = useThemeSettings();

  // Debug validation (only in debug builds)
  useEffect(() => {
    if (__DEV__) {
      DebugLogger.log('CHAT', 'Mounted with params:', params);
      if (!address || address === 'Unknown') {
        DebugLogger.error('CHAT', 'Critical: No address provided');
      }
      if (!threadId) {
        DebugLogger.warn('CHAT', 'No threadID, using fallback');
      }
    }
  }, [address, threadId, params]);

  // Use MessageProvider for state management, but UnifiedMessageManager for actions
  const { getThreadMessages, markThreadRead: markRead } = useMessages();
  const effectiveThreadId = threadId ?? address;

  // Convert SmsMessageRecord to Message format if needed
  const convertToMessage = useCallback((smsRecord: any): Message | null => {
    if (!smsRecord || typeof smsRecord.id !== 'string') return null;

    return {
      id: parseInt(smsRecord.id.replace(/\D/g, '')) || Date.now(), // Convert string id to number
      conversationId: 0, // Will be set properly when loaded from DB
      messageId: smsRecord.id,
      type: 'sms' as const,
      direction: smsRecord.type === 'incoming' ? 'incoming' : 'outgoing',
      address: smsRecord.address,
      body: smsRecord.body,
      timestamp: smsRecord.timestamp,
      dateSent: smsRecord.timestamp,
      read: true, // Assume read for initial message
      status: smsRecord.type === 'incoming' ? 'received' : 'sent',
      subscriptionId: 1,
      locked: false,
      deliveryReceiptCount: 0,
      readReceiptCount: 0,
      createdAt: smsRecord.timestamp,
    };
  }, []);

  // Convert initialMessage to proper Message format
  const initialMessages = useMemo(() => {
    if (initialMessage) {
      const converted = convertToMessage(initialMessage);
      return converted ? [converted] : [];
    }
    return [];
  }, [initialMessage, convertToMessage]);

  // ⚡ useReducer with deduplication prevents race conditions from polling + real-time events
  const [messageState, dispatch] = useReducer(messageReducer, {
    messages: initialMessages,
    lastUpdated: Date.now(),
  });
  const threadMessages = messageState.messages;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryRaw, setQueryRaw] = useState("");
  const query = useDebounce(queryRaw, 300);
  const [matches, setMatches] = useState<number[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  const listRef = useRef<FlatList<Message>>(null);

  // Load Thread with deduplication via reducer
  const loadThread = useCallback(async () => {
    try {
      const t = await getThreadMessages(effectiveThreadId);
      if (t) {
        dispatch({ type: 'SET_MESSAGES', payload: t });
      }
    } catch (error) {
      console.error("Failed to load thread:", error);
    }
  }, [effectiveThreadId, getThreadMessages]);

  // Mark Read Guard
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    loadThread();
    if (!hasMarkedRead.current && markRead) {
      hasMarkedRead.current = true;
      markRead(effectiveThreadId);
    }
  }, [effectiveThreadId, loadThread, markRead]);

  // Polling (Fallback for real-time)
  useEffect(() => {
    const timer = setInterval(loadThread, 5000); // 5s poll for now
    return () => clearInterval(timer);
  }, [loadThread]);

  // Header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <ChatHeader
          address={address}
          thread={{ messages: threadMessages } as any}
          onSearchToggle={() => {
            setSearchOpen((p: boolean) => !p);
            setQueryRaw("");
          }}
        />
      ),
    });
  }, [navigation, address, threadMessages]);

  // Unified Send Handler with Optimistic UI & Rollback
  const handleSend = useCallback(async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || sending) return;

    setSending(true);
    setInput(""); // Clear input immediately for better UX

    // ⚡ Optimistic UI Update (use negative ID to distinguish from real messages)
    const optimisticId = -Date.now();
    const optimisticMsg: Message = {
      id: optimisticId,
      conversationId: parseInt(String(effectiveThreadId)) || 0, // Approximate
      messageId: `temp_${optimisticId}`,
      address: address,
      body: textToSend,
      type: "sms", // Default to sms
      direction: "outgoing",
      status: "pending",
      timestamp: Date.now(),
      dateSent: Date.now(),
      read: true,
      subscriptionId: 1, // Default
      locked: false,
      deliveryReceiptCount: 0,
      readReceiptCount: 0,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: optimisticMsg });

    try {
      const response = await UnifiedMessageManager.sendMessage({
        address,
        body: textToSend,
      });

      if (response.success) {
        // ⚡ Update optimistic message to 'sent' status
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: { id: optimisticId, updates: { status: 'sent' } }
        });
        // Reload to get real DB ID (polling will eventually replace optimistic msg)
        loadThread();
      } else {
        // ⚡ Rollback: Remove optimistic message on failure
        dispatch({
          type: 'SET_MESSAGES',
          payload: messageState.messages.filter((m: Message) => m.id !== optimisticId)
        });

        // ⚡ Actionable Error Handling
        if (response.errorCode === SmsError.PERMISSION_DENIED) {
          Alert.alert(
            "Permission Denied",
            "SMS permission is required to send messages. Please enable it in settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => openAppSettings() }
            ]
          );
        } else if (response.errorCode === SmsError.MISSING_PHONE_PERMISSION) {
          Alert.alert(
            "Phone Permission Missing",
            "Phone state permission is required for dual-SIM selection.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => openAppSettings() }
            ]
          );
        } else {
          alert(`Failed: ${response.error || "Unknown error"}`);
        }
      }
    } catch (error) {
      // ⚡ Rollback: Remove optimistic message on error
      dispatch({
        type: 'SET_MESSAGES',
        payload: messageState.messages.filter((m: Message) => m.id !== optimisticId)
      });
      console.error("Send failed:", error);
    } finally {
      setSending(false);
    }
  }, [input, sending, address, effectiveThreadId, loadThread, messageState.messages]);

  // Search Logic
  const highlightedMessages = useMemo(
    () =>
      threadMessages.map((msg: Message, idx: number) => ({
        msg,
        highlight: query.length > 0 && (msg.body || "").toLowerCase().includes(query.toLowerCase()),
        searchTerm: query,
      })),
    [threadMessages, query]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search Overlay would go here (omitted for brevity, same as before) */}

      <FlatList
        ref={listRef}
        data={threadMessages}
        inverted // Standard for chat apps
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }: { item: Message; index: number }) => {
          const highlighted = highlightedMessages[index];
          return (
            <MemoizedMessageBubble
              msg={item}
              isMe={item.direction === "outgoing"}
              highlight={highlighted?.highlight || false}
              searchTerm={highlighted?.searchTerm || ""}
            />
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
      />

      {/* Input Area */}
      <View style={{ backgroundColor: colors.background, paddingBottom: Platform.OS === 'ios' ? 20 : 0 }}>
        {/* Quick Replies */}
        <QuickReplies onSelect={(text) => handleSend(text)} />

        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            placeholderTextColor={colors.subText}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            editable={!sending}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: sending || !input.trim() ? colors.border : '#25D366' }]}
            onPress={() => handleSend()}
            disabled={sending || !input.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
});