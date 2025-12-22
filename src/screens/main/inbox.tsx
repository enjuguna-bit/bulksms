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
import { Search, Inbox, ArrowDownCircle } from "lucide-react-native";

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { smsReader, smsRole, smsListener, type SmsMessageRecord } from "@/native";
import { useMessageContext } from "@/providers/MessageProvider";
import { addMessage } from "@/db/repositories/messages";

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
  const search = useDebounce(query);

  const listRef = useRef<any>(null);

  async function loadMessages() {
    setLoading(true);
    try {
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

  // Initial load
  useEffect(() => {
    (async () => {
      const isDefault = await smsRole.isDefault();
      if (!isDefault) {
        await smsRole.requestDefault();
      }
      await loadMessages();
    })();
  }, []);

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
          m.address?.toLowerCase().includes(q) ||
          m.body?.toLowerCase().includes(q)
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

  const renderItem = useCallback<ListRenderItem<SmsMessageRecord>>(({ item }) => (
    <TouchableOpacity
      onPress={() => handleMessagePress(item)}
      onLongPress={() =>
        Alert.alert("Message Options", item.address || "No number", [
          { text: "Copy Number", onPress: () => console.log("copy", item.address) },
          { text: "Cancel", style: "cancel" },
        ])
      }
      style={[styles.msgRow, { borderBottomColor: colors.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.addr, { color: colors.text }]}>{item.address || "Unknown"}</Text>
        <Text numberOfLines={1} style={[styles.body, { color: colors.subText }]}>
          {item.body}
        </Text>
      </View>

      <View style={styles.metaBox}>
        <Text style={[styles.time, { color: colors.subText }]}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        <Text
          style={[
            styles.badge,
            item.type === "incoming"
              ? { backgroundColor: colors.chip, color: colors.accent }
              : { backgroundColor: "#dcfce7", color: "#16a34a" },
          ]}
        >
          {item.type === "incoming" ? "IN" : "OUT"}
        </Text>
      </View>
    </TouchableOpacity>
  ), [colors, router, handleMessagePress]);

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
            <Text
              key={f}
              onPress={() => {
                setFilter(f as any);
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}
              style={[
                styles.filter,
                { color: colors.subText },
                filter === f && { color: colors.accent, textDecorationLine: "underline" }
              ]}
            >
              {f.toUpperCase()}
            </Text>
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
      />

      {/* Refresh FAB */}
      <TouchableOpacity
        onPress={loadMessages}
        style={[styles.fab, { backgroundColor: colors.accent }]}
        disabled={loading}
      >
        <ArrowDownCircle color="#fff" size={26} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, marginLeft: 6, paddingVertical: 8 },
  filterRow: { flexDirection: "row", gap: 12 },
  filter: { fontWeight: "600" },
  msgRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addr: { fontWeight: "700" },
  body: { fontSize: 13, marginTop: 2 },
  metaBox: { alignItems: "flex-end", marginLeft: 8 },
  time: { fontSize: 12 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  emptyBox: { padding: 40, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 10, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    padding: 12,
    borderRadius: 30,
    elevation: 3,
  },
});
