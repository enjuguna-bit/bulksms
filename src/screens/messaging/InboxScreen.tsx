// -------------------------------------------------------------
// 📬 InboxScreen - Conversation List (Messages App Style)
// -------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  X,
  MessageCirclePlus,
  Trash2,
  Archive,
  CheckCircle,
  MoreVertical,
  Pin,
} from 'lucide-react-native';

import { useThemeSettings } from '@/theme/ThemeProvider';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  Conversation,
  ConversationFilter,
  SortOrder,
  getConversations,
  markConversationAsRead,
  deleteMultiple,
  archiveMultiple,
  markMultipleAsRead,
  syncMessageFromNative,
  initMessagingSchema,
} from '@/db/messaging';
import { smsReader, smsListener, type SmsMessageRecord } from '@/native';
import { prefetchContacts, getContactName } from '@/utils/contactUtils';
import ConversationItem from './ConversationItem';
import { getFixedHeightListProps } from '@/utils/performance/listOptimizations';
import { useStableCallback } from '@/utils/performance/reactOptimizations';

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------

interface InboxState {
  conversations: Conversation[];
  isLoading: boolean;
  isRefreshing: boolean;
  searchQuery: string;
  filter: ConversationFilter;
  sortOrder: SortOrder;
  selectedIds: Set<number>;
  isSelectionMode: boolean;
  error: string | null;
  syncProgress: number;
}

type InboxAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER'; payload: ConversationFilter }
  | { type: 'SET_SORT'; payload: SortOrder }
  | { type: 'TOGGLE_SELECTION'; payload: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ALL' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SYNC_PROGRESS'; payload: number };

function inboxReducer(state: InboxState, action: InboxAction): InboxState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, isRefreshing: action.payload };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload, isLoading: false, isRefreshing: false };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    case 'SET_SORT':
      return { ...state, sortOrder: action.payload };
    case 'TOGGLE_SELECTION': {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return {
        ...state,
        selectedIds: newSelected,
        isSelectionMode: newSelected.size > 0,
      };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: new Set(), isSelectionMode: false };
    case 'SELECT_ALL':
      return {
        ...state,
        selectedIds: new Set(state.conversations.map(c => c.id)),
        isSelectionMode: true,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SYNC_PROGRESS':
      return { ...state, syncProgress: action.payload };
    default:
      return state;
  }
}

const initialState: InboxState = {
  conversations: [],
  isLoading: true,
  isRefreshing: false,
  searchQuery: '',
  filter: 'all',
  sortOrder: 'recent',
  selectedIds: new Set(),
  isSelectionMode: false,
  error: null,
  syncProgress: 0,
};

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------

export default function InboxScreen() {
  const router = useSafeRouter();
  const { colors, theme } = useThemeSettings();
  const isDark = theme === 'dark';

  const [state, dispatch] = useReducer(inboxReducer, initialState);
  const listRef = useRef<FlatList>(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------

  const loadConversations = useCallback(async (showLoading = true) => {
    if (showLoading) dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await initMessagingSchema();
      const conversations = await getConversations(
        state.filter,
        state.sortOrder,
        state.searchQuery
      );
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } catch (error: any) {
      console.error('[InboxScreen] Load failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [state.filter, state.sortOrder, state.searchQuery]);

  // Initial sync from native SMS
  const syncFromNative = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Request SMS permission first
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Permission Required',
          'SMS permission is required to load your existing messages.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Grant Permission',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      dispatch({ type: 'SET_SYNC_PROGRESS', payload: 0 });

      // Try to get more historical messages (increase from 2000 to 10000)
      let nativeMessages = await smsReader.getAll(10000);

      // Fallback if import returns nothing (e.g. module not ready)
      if (!nativeMessages || nativeMessages.length === 0) {
        nativeMessages = await smsReader.getAll(10000);
      }

      if (!nativeMessages || nativeMessages.length === 0) {
        console.log('[InboxScreen] No native messages to sync');
        return;
      }

      console.log(`[InboxScreen] Found ${nativeMessages.length} native messages to sync`);

      // Group by address to get latest per thread
      const threadMap = new Map<string, SmsMessageRecord>();
      for (const msg of nativeMessages) {
        if (!msg.address || msg.address === 'Unknown') continue;

        const existing = threadMap.get(msg.address);
        if (!existing || (msg.timestamp > existing.timestamp)) {
          threadMap.set(msg.address, msg);
        }
      }

      // Sync each thread to local DB
      const threads = Array.from(threadMap.values());
      let synced = 0;

      console.log(`[InboxScreen] Syncing ${threads.length} conversation threads`);

      for (const msg of threads) {
        try {
          const contactName = await getContactName(msg.address);
          await syncMessageFromNative(
            msg.address,
            msg.body || '',
            msg.type === 'outgoing' ? 'outgoing' : 'incoming',
            msg.timestamp || Date.now(),
            contactName || undefined
          );
          synced++;
          dispatch({ type: 'SET_SYNC_PROGRESS', payload: Math.round((synced / threads.length) * 100) });
        } catch (syncError) {
          console.error(`[InboxScreen] Failed to sync message for ${msg.address}:`, syncError);
          // Continue with other messages
        }
      }

      console.log(`[InboxScreen] Successfully synced ${synced}/${threads.length} conversations`);
      dispatch({ type: 'SET_SYNC_PROGRESS', payload: 0 });

    } catch (error) {
      console.error('[InboxScreen] Native sync failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to sync existing messages. Check SMS permissions.' });
      dispatch({ type: 'SET_SYNC_PROGRESS', payload: 0 });
    }
  }, []);

  // Load on focus - only when component actually focuses
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      return () => { }; // cleanup function
    }, [loadConversations])
  );

  // Initial native sync - run once on mount
  useEffect(() => {
    let mounted = true;

    const runInitialSync = async () => {
      if (!mounted) return;
      await syncFromNative();
      if (mounted) {
        await loadConversations();
      }
    };

    runInitialSync();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Listen for new SMS - stable listener that doesn't depend on changing functions
  useEffect(() => {
    const subscription = smsListener.addListener(async (event) => {
      try {
        const contactName = await getContactName(event.phone);
        await syncMessageFromNative(
          event.phone,
          event.body,
          'incoming',
          event.timestamp,
          contactName || undefined
        );
        // Don't call loadConversations here - let focus effect handle it
        // or use a ref to track if component is focused
      } catch (error) {
        console.error('[InboxScreen] Failed to sync incoming SMS:', error);
      }
    });

    return () => subscription.remove();
  }, []); // Empty dependency array - stable listener

  // Reload when filter/search changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------

  // ⚡ Stable callbacks to prevent child re-renders
  const handleConversationPress = useStableCallback((conversation: Conversation) => {
    if (state.isSelectionMode) {
      dispatch({ type: 'TOGGLE_SELECTION', payload: conversation.id });
    } else {
      router.safePush('ChatScreen', {
        conversationId: conversation.id,
        address: conversation.recipientNumber,
        name: conversation.recipientName,
      });
    }
  });

  const handleConversationLongPress = useStableCallback((conversation: Conversation) => {
    dispatch({ type: 'TOGGLE_SELECTION', payload: conversation.id });
  });

  const handleNewMessage = useStableCallback(() => {
    router.safePush('ContactPicker', { mode: 'single' });
  });

  const handleDeleteSelected = useCallback(async () => {
    const count = state.selectedIds.size;
    Alert.alert(
      'Delete Conversations',
      `Delete ${count} conversation${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMultiple(Array.from(state.selectedIds));
              dispatch({ type: 'CLEAR_SELECTION' });
              loadConversations();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversations');
            }
          },
        },
      ]
    );
  }, [state.selectedIds, loadConversations]);

  const handleArchiveSelected = useCallback(async () => {
    try {
      await archiveMultiple(Array.from(state.selectedIds));
      dispatch({ type: 'CLEAR_SELECTION' });
      loadConversations();
    } catch (error) {
      Alert.alert('Error', 'Failed to archive conversations');
    }
  }, [state.selectedIds, loadConversations]);

  const handleMarkReadSelected = useCallback(async () => {
    try {
      await markMultipleAsRead(Array.from(state.selectedIds));
      dispatch({ type: 'CLEAR_SELECTION' });
      loadConversations();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as read');
    }
  }, [state.selectedIds, loadConversations]);

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      isSelected={state.selectedIds.has(item.id)}
      isSelectionMode={state.isSelectionMode}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleConversationLongPress(item)}
    />
  ), [state.selectedIds, state.isSelectionMode, handleConversationPress, handleConversationLongPress]);

  const keyExtractor = useCallback((item: Conversation) => item.id.toString(), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      {state.isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} testID="loading-indicator" />
      ) : (
        <>
          <MessageCirclePlus size={64} color={colors.subText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No conversations yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
            Start a new message to begin
          </Text>
        </>
      )}
    </View>
  ), [state.isLoading, colors]);

  const ItemSeparator = useCallback(() => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  ), [colors.border]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {state.isSelectionMode ? (
          // Selection Mode Header
          <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_SELECTION' })}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.selectionCount, { color: colors.text }]}>
              {state.selectedIds.size} selected
            </Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'SELECT_ALL' })}>
              <Text style={{ color: colors.accent }}>Select All</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Normal Header
          <>
            <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  } else {
                    dispatch({ type: 'SET_SEARCH', payload: '' });
                  }
                }}
                style={styles.headerButton}
              >
                {showSearch ? (
                  <X size={22} color={colors.text} />
                ) : (
                  <Search size={22} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={18} color={colors.subText} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={colors.subText}
            value={state.searchQuery}
            onChangeText={(text) => dispatch({ type: 'SET_SEARCH', payload: text })}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {state.searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch({ type: 'SET_SEARCH', payload: '' })}>
              <X size={18} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Chips */}
      <View style={[styles.filterRow, { backgroundColor: colors.background }]}>
        {(['all', 'unread', 'archived'] as ConversationFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => dispatch({ type: 'SET_FILTER', payload: f })}
            style={[
              styles.filterChip,
              state.filter === f && { backgroundColor: colors.accent + '20' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: state.filter === f ? colors.accent : colors.subText },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sync Progress */}
      {state.syncProgress > 0 && (
        <View style={[styles.syncBar, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.syncText, { color: colors.subText }]}>
            Syncing messages... {state.syncProgress}%
          </Text>
        </View>
      )}

      {/* Error Banner */}
      {state.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity onPress={() => loadConversations()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conversation List */}
      <FlatList
        ref={listRef}
        data={state.conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={() => {
              dispatch({ type: 'SET_REFRESHING', payload: true });
              syncFromNative().then(() => loadConversations(false));
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
            testID="refresh-control"
          />
        }
        contentContainerStyle={state.conversations.length === 0 ? styles.emptyList : undefined}
        {...getFixedHeightListProps(80)}
      />

      {/* Selection Actions Bar */}
      {state.isSelectionMode && (
        <View style={[styles.selectionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.selectionAction} onPress={handleMarkReadSelected}>
            <CheckCircle size={22} color={colors.text} />
            <Text style={[styles.selectionActionText, { color: colors.text }]}>Read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionAction} onPress={handleArchiveSelected}>
            <Archive size={22} color={colors.text} />
            <Text style={[styles.selectionActionText, { color: colors.text }]}>Archive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionAction} onPress={handleDeleteSelected}>
            <Trash2 size={22} color="#ef4444" />
            <Text style={[styles.selectionActionText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {!state.isSelectionMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={handleNewMessage}
          activeOpacity={0.8}
        >
          <MessageCirclePlus size={26} color="#fff" />
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  syncText: {
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  retryText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectionAction: {
    alignItems: 'center',
    gap: 4,
  },
  selectionActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
