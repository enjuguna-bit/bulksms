// -------------------------------------------------------------
// 💬 ChatScreenNew - Conversation Messages View
// -------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, ArrowLeft, Phone, MoreVertical, Check, CheckCheck } from 'lucide-react-native';

import { useThemeSettings } from '@/theme/ThemeProvider';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  Message,
  Conversation,
  getConversationById,
  getOrCreateConversation,
  getMessages,
  insertMessage,
  updateMessageStatus,
  markConversationAsRead,
  saveDraft,
  formatTimestamp,
} from '@/db/messaging';
import { UnifiedMessageManager } from '@/services/unifiedMessageService';
import { smsListener } from '@/native';
import { SmsError } from "@/services/smsService";
import { openAppSettings } from "@/utils/requestPermissions";
import { getVariableHeightListProps } from '@/utils/performance/listOptimizations';


// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------

interface ChatState {
  messages: Message[];
  conversation: Conversation | null;
  isLoading: boolean;
  isSending: boolean;
  draftText: string;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONVERSATION'; payload: Conversation }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: number; updates: Partial<Message> } }
  | { type: 'SET_SENDING'; payload: boolean }
  | { type: 'SET_DRAFT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CONVERSATION':
      return { ...state, conversation: action.payload, draftText: action.payload.draftText || '' };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, isLoading: false };
    case 'ADD_MESSAGE':
      // Add new message, avoiding duplicates
      if (state.messages.some(m => m.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [action.payload, ...state.messages] };
    case 'UPDATE_MESSAGE': {
      const idx = state.messages.findIndex(m => m.id === action.payload.id);
      if (idx === -1) return state;
      const updated = [...state.messages];
      updated[idx] = { ...updated[idx], ...action.payload.updates };
      return { ...state, messages: updated };
    }
    case 'SET_SENDING':
      return { ...state, isSending: action.payload };
    case 'SET_DRAFT':
      return { ...state, draftText: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

const initialState: ChatState = {
  messages: [],
  conversation: null,
  isLoading: true,
  isSending: false,
  draftText: '',
  error: null,
};

// -------------------------------------------------------------
// Message Bubble Component
// -------------------------------------------------------------

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  colors: any;
}

const MessageBubble = React.memo(({ message, isMe, colors }: MessageBubbleProps) => {
  const bubbleColor = isMe ? colors.accent : (colors.theme === 'dark' ? '#374151' : '#e5e7eb');
  const textColor = isMe ? '#fff' : colors.text;

  const renderStatus = () => {
    if (!isMe) return null;

    switch (message.status) {
      case 'pending':
        return <ActivityIndicator size={12} color={textColor} style={{ marginLeft: 4 }} />;
      case 'sent':
        return <Check size={14} color={textColor} style={{ marginLeft: 4, opacity: 0.7 }} />;
      case 'delivered':
      case 'read':
        return <CheckCheck size={14} color={textColor} style={{ marginLeft: 4, opacity: 0.7 }} />;
      case 'failed':
        return <Text style={{ color: '#ef4444', fontSize: 10, marginLeft: 4 }}>Failed</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        <Text style={[styles.bubbleText, { color: textColor }]}>
          {message.body || ''}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subText }]}>
            {formatTimestamp(message.timestamp)}
          </Text>
          {renderStatus()}
        </View>
      </View>
    </View>
  );
});

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------

interface ChatScreenProps {
  route: {
    params: {
      conversationId?: number;
      address: string;
      name?: string;
    };
  };
  navigation: any;
}

export default function ChatScreenNew({ route, navigation }: ChatScreenProps) {
  const { colors, theme } = useThemeSettings();
  const router = useSafeRouter();

  const params = route.params || {};
  const { conversationId, address, name } = params;

  const [state, dispatch] = useReducer(chatReducer, initialState);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------

  const loadConversation = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      let conversation: Conversation | null = null;

      if (conversationId) {
        conversation = await getConversationById(conversationId);
      }

      if (!conversation && address) {
        conversation = await getOrCreateConversation(address, name);
      }

      if (!conversation) {
        dispatch({ type: 'SET_ERROR', payload: 'Conversation not found' });
        return;
      }

      dispatch({ type: 'SET_CONVERSATION', payload: conversation });

      // Load messages
      const messages = await getMessages(conversation.id, 100);
      dispatch({ type: 'SET_MESSAGES', payload: messages });

      // Mark as read
      await markConversationAsRead(conversation.id);
    } catch (error: any) {
      console.error('[ChatScreen] Load failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [conversationId, address, name]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Listen for new messages
  useEffect(() => {
    if (!state.conversation) return;

    const subscription = smsListener.addListener(async (event) => {
      // Only handle messages for this conversation
      if (event.phone !== state.conversation?.recipientNumber) return;

      // Reload messages
      const messages = await getMessages(state.conversation.id, 100);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
      await markConversationAsRead(state.conversation.id);
    });

    return () => subscription.remove();
  }, [state.conversation]);

  // Save draft on unmount
  useEffect(() => {
    return () => {
      if (state.conversation && state.draftText.trim()) {
        saveDraft(state.conversation.id, state.draftText);
      }
    };
  }, [state.conversation, state.draftText]);

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------

  const handleSend = useCallback(async () => {
    if (!state.draftText.trim() || state.isSending || !state.conversation) return;

    const textToSend = state.draftText.trim();
    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'SET_DRAFT', payload: '' });

    // Clear draft in DB
    saveDraft(state.conversation.id, null);

    // Optimistic update
    const optimisticMsg: Message = {
      id: -Date.now(),
      conversationId: state.conversation.id,
      messageId: `temp_${Date.now()}`,
      type: 'sms',
      direction: 'outgoing',
      address: state.conversation.recipientNumber,
      body: textToSend,
      timestamp: Date.now(),
      dateSent: Date.now(),
      read: true,
      status: 'pending',
      subscriptionId: -1,
      locked: false,
      deliveryReceiptCount: 0,
      readReceiptCount: 0,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: optimisticMsg });

    try {
      // Insert to DB first
      const dbMessage = await insertMessage(
        state.conversation.id,
        state.conversation.recipientNumber,
        textToSend,
        'outgoing',
        'pending'
      );

      // Send via native SMS
      const response = await UnifiedMessageManager.sendMessage({
        address: state.conversation.recipientNumber,
        body: textToSend,
      });

      if (response.success) {
        await updateMessageStatus(dbMessage.id, 'sent');
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: { id: optimisticMsg.id, updates: { id: dbMessage.id, status: 'sent' } },
        });
      } else {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: { id: optimisticMsg.id, updates: { id: dbMessage.id, status: 'failed' } },
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
          Alert.alert('Send Failed', response.error || 'Message could not be sent');
        }
      }
    } catch (error: any) {
      console.error('[ChatScreen] Send failed:', error);
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: optimisticMsg.id, updates: { status: 'failed' } },
      });
      Alert.alert('Send Failed', error.message || 'Message could not be sent');
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.draftText, state.isSending, state.conversation]);

  const handleBack = useCallback(() => {
    if (state.conversation && state.draftText.trim()) {
      saveDraft(state.conversation.id, state.draftText);
    }
    router.back();
  }, [state.conversation, state.draftText, router]);

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------

  const displayName = state.conversation?.recipientName || name || address || 'Unknown';

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isMe={item.direction === 'outgoing'}
      colors={{ ...colors, theme }}
    />
  ), [colors, theme]);

  const keyExtractor = useCallback((item: Message) => item.id.toString(), []);

  if (state.error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>{state.error}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
            <Text style={{ color: colors.accent }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.headerAvatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {state.conversation && (
              <Text style={[styles.headerNumber, { color: colors.subText }]}>
                {state.conversation.recipientNumber}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Phone size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MoreVertical size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {state.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={state.messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            {...getVariableHeightListProps()}
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.subText}
            value={state.draftText}
            onChangeText={(text) => dispatch({ type: 'SET_DRAFT', payload: text })}
            multiline
            maxLength={1000}
            editable={!state.isSending}
          />
          <TouchableOpacity
            testID="send-button"
            style={[
              styles.sendButton,
              { backgroundColor: state.draftText.trim() && !state.isSending ? colors.accent : colors.border },
            ]}
            onPress={handleSend}
            disabled={!state.draftText.trim() || state.isSending}
          >
            {state.isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerNumber: {
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleContainer: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorButton: {
    padding: 12,
  },
});
