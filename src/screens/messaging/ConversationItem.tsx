// -------------------------------------------------------------
// 💬 ConversationItem - Single Conversation Row
// -------------------------------------------------------------

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Pin, VolumeX, Check, CheckCheck } from 'lucide-react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Conversation, formatTimestamp } from '@/db/messaging';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function ConversationItem({
  conversation,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
}: ConversationItemProps) {
  const { colors } = useThemeSettings();

  const hasUnread = conversation.unreadCount > 0;
  const hasDraft = !!conversation.draftText;
  const displayName = conversation.recipientName || conversation.recipientNumber;
  const initial = displayName.charAt(0).toUpperCase();

  // Convert color number to hex string
  const avatarColor = `#${conversation.color.toString(16).padStart(6, '0')}`;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.border : (isSelected ? `${colors.accent}20` : 'transparent') },
      ]}
      android_ripple={{ color: colors.border }}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Check size={16} color="#fff" />}
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {conversation.avatarUri ? (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}

        {/* Unread Indicator Dot */}
        {hasUnread && !isSelectionMode && (
          <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Top Row: Name + Time */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              { color: colors.text },
              hasUnread && styles.nameBold,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          <Text style={[styles.time, { color: colors.subText }]}>
            {formatTimestamp(conversation.lastMessageTimestamp)}
          </Text>
        </View>

        {/* Bottom Row: Snippet + Badges */}
        <View style={styles.bottomRow}>
          {/* Status Icons */}
          <View style={styles.statusIcons}>
            {hasDraft && (
              <Text style={[styles.draftLabel, { color: '#ef4444' }]}>Draft: </Text>
            )}
            {conversation.muted && (
              <VolumeX size={14} color={colors.subText} style={styles.icon} />
            )}
            {conversation.pinned && (
              <Pin size={14} color={colors.accent} style={styles.icon} />
            )}
          </View>

          {/* Snippet */}
          <Text
            style={[
              styles.snippet,
              { color: hasUnread ? colors.text : colors.subText },
              hasUnread && styles.snippetBold,
            ]}
            numberOfLines={2}
          >
            {hasDraft ? conversation.draftText : conversation.snippet || 'No messages'}
          </Text>

          {/* Unread Badge */}
          {hasUnread && !isSelectionMode && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.unreadText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94a3b8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  draftLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  snippet: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  snippetBold: {
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default memo(ConversationItem);
