import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

// Types
interface Conversation {
  id: number;
  recipientName: string;
  recipientPhone: string;
  lastMessageAt: number;
  unreadCount: number;
  snippet: string;
}

interface OptimizedConversationListProps {
  conversations: Conversation[];
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Memoized conversation item component for optimal re-rendering
 */
const ConversationItem = memo(({
  conversation,
  onPress
}: {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(conversation.recipientName || conversation.recipientPhone).charAt(0).toUpperCase()}
          </Text>
        </View>
        {conversation.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.recipientName || conversation.recipientPhone}
          </Text>
          <Text style={styles.time}>
            {formatTime(conversation.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={styles.snippet} numberOfLines={1}>
            {conversation.snippet || 'No messages yet'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadIndicator} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

ConversationItem.displayName = 'ConversationItem';

/**
 * Optimized conversation list using FlashList for virtualization
 * Handles large datasets efficiently with automatic virtualization
 */
export const OptimizedConversationList = memo(({
  conversations,
  loading = false,
  onRefresh,
  refreshing = false,
}: OptimizedConversationListProps) => {
  const navigation = useNavigation();

  const handleConversationPress = (conversation: Conversation) => {
    // @ts-ignore - navigation typing
    navigation.navigate('Conversation', {
      conversationId: conversation.id,
      address: conversation.recipientPhone,
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      onPress={handleConversationPress}
    />
  );

  const keyExtractor = (item: Conversation) => item.id.toString();

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading conversations...' : 'No conversations yet'}
      </Text>
    </View>
  );

  // Memoize data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => conversations, [conversations]);

  return (
    <FlashList
      data={memoizedData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={80} // Approximate height for better performance
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={conversations.length === 0 ? styles.emptyListContainer as any : undefined}
      // Performance optimizations
      removeClippedSubviews={true}
    />
  );
});

OptimizedConversationList.displayName = 'OptimizedConversationList';

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#43B02A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 14,
    color: '#8E8E93',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snippet: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#43B02A',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
});
