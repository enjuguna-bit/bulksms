// -----------------------------------------------------
// app/main/inbox.tsx — Interactive Premium Inbox
// React Navigation Version (no expo-router)
// -----------------------------------------------------

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
} from "react-native";
import { Search, Inbox, MessageCirclePlus } from "lucide-react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { smsReader, smsRole, smsListener, type SmsMessageRecord } from "@/native";
import { useMessageContext } from "@/providers/MessageProvider";
import { addMessage } from "@/db/repositories/messages";
import { ThreadItem } from "@/components/inbox/ThreadItem";
import { prefetchContacts } from "@/utils/contactUtils";
import { ComposeOptionsSheet } from "@/components/inbox/ComposeOptionsSheet";

// Debounce helper
function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// SMS permission
async function ensureSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: "SMS Access Required",
      message: "SMS Manager needs access to your SMS inbox.",
      buttonPositive: "Allow",
    }
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Read SMS inbox through native module wrapper
async function fetchInboxMessages() {
  const hasPermission = await ensureSmsPermission();
  if (!hasPermission) return [];

  try {
    const result = await smsReader.getAll();
    const all = result.sort((a, b) => b.timestamp - a.timestamp);

    // Group by phone number
    const threadMap = new Map<string, SmsMessageRecord>();
    for (const msg of all) {
      if (!threadMap.has(msg.address)) {
        threadMap.set(msg.address, msg);
      }
    }

    return Array.from(threadMap.values());
  } catch (e) {
    console.error("❌ Failed to read SMS inbox:", e);
    return [];
  }
}

export default function InboxScreen() {
  const router = useSafeRouter();
  const { colors } = useThemeSettings();

  const [messages, setMessages] = useState<SmsMessageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing">("all");
  const [query, setQuery] = useState("");
  const [composeVisible, setComposeVisible] = useState(false);
  const search = useDebounce(query);

  const listRef = useRef<FlatList<any>>(null);

  async function loadMessages() {
    setLoading(true);
    try {
      // Prefetch contacts for name resolution
      await prefetchContacts();
      const data = await fetchInboxMessages();
      setMessages(data);
    } finally {
      setLoading(false);
    }
  }

  // Refresh when screen gains focus (e.g. back from Chat)
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [])
  );

  // useFocusEffect handles both initial load and refresh on focus
  // No need for a separate initial useEffect

  // Auto-scroll to top when messages change
  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]);

  // Realtime SMS listener
  useEffect(() => {
    const sub = smsListener.addListener((event) => {
      setMessages((prev) => {
        const existing = prev.filter((m) => m.address !== event.phone);
        return [
          {
            id: `inbox-${event.timestamp}`,
            address: event.phone,
            body: event.body,
            timestamp: event.timestamp,
            type: "incoming",
          },
          ...existing,
        ];
      });
    });

    return () => sub.remove();
  }, []);

  const filteredMessages = useMemo(() => {
    let result = messages;

    if (filter !== "all") result = result.filter((m) => m.type === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          (m.address || "").toLowerCase().includes(q) ||
          (m.body || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [messages, filter, search]);

  const { refreshThreads } = useMessageContext();

  const handleMessagePress = useCallback(async (item: SmsMessageRecord) => {
    // Sync this message to the database before navigating
    // UNBLOCK UI: Don't await this, let it run in background
    addMessage(
      item.address,
      item.body,
      item.type,
      'sent',
      item.timestamp,
      item.address // Use address as threadId
    ).catch(err => {
      console.error("Background import failed:", err);
    });

    // Navigate IMMEDIATELY to avoid freezing
    router.safePush("ChatScreen", {
      address: item.address,
      initialMessage: item // Pass for immediate rendering
    });

    // Refresh threads in background so the list is updated when we return
    refreshThreads();
  }, [router, refreshThreads]);

  // Handle New Chat / Bulk Message
  const handleCompose = () => {
    setComposeVisible(true);
  };

  const handleComposeOption = (optionId: string) => {
    setComposeVisible(false);

    setTimeout(() => {
      if (optionId === 'single') {
        router.safePush("ContactPicker", { mode: 'single' });
      } else if (optionId === 'bulk') {
        router.safePush("ContactPicker", { mode: 'multiple' });
      } else {
        Alert.alert("Coming Soon", "Group creation will be available in the next update.");
      }
    }, 300); // Allow modal to close
  };

  const renderItem = useCallback<ListRenderItem<SmsMessageRecord>>(({ item }) => (
    <ThreadItem
      item={item}
      onPress={handleMessagePress}
      onLongPress={() =>
        Alert.alert("Thread Options", item.address || "No number", [
          { text: "Delete", style: "destructive" },
          { text: "Archive" },
          { text: "Cancel", style: "cancel" },
        ])
      }
    />
  ), [handleMessagePress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.subText} />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor={colors.subText}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <View style={styles.filterRow}>
          {["all", "incoming", "outgoing"].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => {
                setFilter(f as any);
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}
              style={[
                styles.filterChip,
                filter === f && { backgroundColor: colors.chip }
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f ? colors.accent : colors.subText },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        ref={listRef}
        data={filteredMessages}
        keyExtractor={(item: SmsMessageRecord) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadMessages} tintColor={colors.accent} />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Inbox size={48} color={colors.subText} />
            <Text style={[styles.emptyText, { color: colors.subText }]}>No messages yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 80 }} />}
      />

      {/* Refresh FAB */}
      <TouchableOpacity
        onPress={handleCompose}
        style={[styles.fab, { backgroundColor: '#25D366' }]} // WhatsApp Green
        activeOpacity={0.8}
      >
        <MessageCirclePlus color="#fff" size={26} />
      </TouchableOpacity>

      <ComposeOptionsSheet
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onOptionSelect={handleComposeOption}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 20, // Rounded full
    marginBottom: 12,
    height: 40,
  },
  searchInput: { flex: 1, marginLeft: 6, paddingVertical: 4 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  filterText: { fontWeight: "600", fontSize: 13 },
  emptyBox: { padding: 40, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 10, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
