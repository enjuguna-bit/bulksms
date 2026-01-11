// ============================================================================
// 📒 ThreadsScreen — WhatsApp-style Thread List
// ============================================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useMessages } from "@/providers/MessageProvider";
import { performInitialSyncIfNeeded, getExistingMessageCount, checkSmsSyncPermissions } from "@/services/smsSync";
import { isDefaultSmsApp, promptDefaultSmsApp } from "@/services/defaultSmsRole";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { useNavigation } from "@react-navigation/native";
import {
  formatTimestamp,
  messagePreview,
} from "@/utils/messageFormatters";

import { type Conversation } from "@/db/messaging";

// -----------------------------------------------------------
// Component
// -----------------------------------------------------------
export default function ThreadsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeSettings();
  const { threads, loading, refreshThreads } = useMessages();
  const [syncing, setSyncing] = useState(false);

  // Manual sync function
  const handleManualSync = useCallback(async () => {
    try {
      setSyncing(true);

      // Check if app is default SMS handler
      const isDefault = await isDefaultSmsApp();
      if (!isDefault) {
        Alert.alert(
          "SMS Access Required",
          "To sync existing messages, this app must be set as the default SMS handler.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Set Now", onPress: async () => {
                await promptDefaultSmsApp();
                // Give user time to complete the action
                setTimeout(() => {
                  refreshThreads();
                }, 3000);
              }
            }
          ]
        );
        return;
      }

      // Check permissions
      const hasPermissions = await checkSmsSyncPermissions();
      if (!hasPermissions) {
        Alert.alert("Permissions Required", "SMS read permissions are needed to sync messages.");
        return;
      }

      // Perform sync
      const result = await performInitialSyncIfNeeded();
      if (result.synced && result.imported > 0) {
        Alert.alert("Sync Complete", `Imported ${result.imported} messages.`);
        await refreshThreads();
      } else {
        Alert.alert("Sync", "No new messages to sync.");
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      Alert.alert("Sync Failed", "Unable to sync messages. Please check permissions.");
    } finally {
      setSyncing(false);
    }
  }, [refreshThreads]);

  // -----------------------------------------------------------------------
  // Render each conversation row
  // -----------------------------------------------------------------------
  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => {
      // Use conversation properties directly
      const hasUnread = item.unreadCount > 0;

      return (
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate("ChatScreen", {
              address: item.recipientNumber,
              name: item.recipientName
            })
          }
        >
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {item.recipientName.substring(0, 2).toUpperCase()}
            </Text>
          </View>

          {/* Main content */}
          <View style={styles.content}>
            <Text style={[styles.name, { color: colors.text }]}>
              {item.recipientName}
            </Text>

            <Text
              style={[styles.preview, { color: hasUnread ? colors.text : colors.subText, fontWeight: hasUnread ? '700' : '400' }]}
              numberOfLines={1}
            >
              {item.snippet || "No message"}
            </Text>
          </View>

          {/* Right side: time & unread */}
          <View style={styles.meta}>
            <Text style={[styles.time, { color: colors.subText }]}>
              {formatTimestamp(item.lastMessageTimestamp)}
            </Text>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, colors]
  );

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary600 }]}
            onPress={handleManualSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.syncButtonText}>Sync</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.subText, marginTop: 10 }}>Loading conversations…</Text>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Main list
  // -----------------------------------------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: colors.primary600 }]}
          onPress={handleManualSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item: Conversation) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: colors.subText }}>No conversations yet</Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
  },
  content: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  preview: {
    fontSize: 14,
  },
  meta: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
});
