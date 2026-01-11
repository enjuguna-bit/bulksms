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
import { DebugLogger } from '@/utils/debug';

import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { smsReader, smsRole, smsListener, type SmsMessageRecord } from "@/native";
import { useMessageContext } from "@/providers/MessageProvider";
import { addMessage } from "@/db/repositories/messages";
import { bufferIncomingSms, processBufferedMessages } from "@/services/incomingSmsProcessor";
import { ThreadItem } from "@/components/inbox/ThreadItem";
import { prefetchContacts } from "@/utils/contactUtils";
import { ComposeOptionsSheet } from "@/components/inbox/ComposeOptionsSheet";
import { PermissionStatusBanner } from "@/components/permissions/PermissionStatusBanner";
import { checkSmsAndContactPermissionsDetailed, type DetailedPermissionResult } from "@/utils/requestPermissions";
import { getOrCreateConversationFromAddress } from '@/db/messaging/repository';

// Debounce helper
function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ✅ UNIFIED: Check SMS permissions with detailed status
async function checkSmsPermissions(): Promise<DetailedPermissionResult> {
  return await checkSmsAndContactPermissionsDetailed();
}

// Read SMS inbox through native module wrapper
async function fetchInboxMessages() {
  DebugLogger.log('FETCH', 'Starting SMS fetch');

  const permissions = await checkSmsPermissions();
  if (!permissions.READ_SMS) {
    DebugLogger.warn('FETCH', 'READ_SMS permission denied');
    return [];
  }

  try {
    const start = Date.now();
    // Use higher limit to fetch all existing messages from phone
    const result = await smsReader.getAll(5000);
    DebugLogger.log('FETCH', `Native returned ${result.length} in ${Date.now() - start}ms`);

    // Sort by timestamp newly
    const sorted = result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Group by phone number
    const threadMap = new Map<string, SmsMessageRecord>();
    const seenIds = new Set<string>();

    for (const msg of sorted) {
      // Validate address
      if (!msg.address || msg.address === 'Unknown') continue;

      // Validation & ID generation
      if (!msg.id) msg.id = `gen-${msg.address}-${msg.timestamp}`;

      if (!threadMap.has(msg.address)) {
        threadMap.set(msg.address, msg);
      }
    }

    // Convert to array
    const threads = Array.from(threadMap.values()).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );
    DebugLogger.log('FETCH', `Processed ${threads.length} unique threads`);
    return threads;

  } catch (e) {
    DebugLogger.error("FETCH", "Failed to read SMS inbox:", e);
    return [];
  }
}

export default function InboxScreen() {
  const router = useSafeRouter();
  const { colors } = useThemeSettings();

  const [messages, setMessages] = useState<SmsMessageRecord[]>([]);
  const [loading, setLoading] = useState(true); // Start true
  const [lastError, setLastError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing">("all");
  const [query, setQuery] = useState("");
  const [composeVisible, setComposeVisible] = useState(false);
  const search = useDebounce(query);
  const [permissionStatus, setPermissionStatus] = useState<DetailedPermissionResult | null>(null);

  const listRef = useRef<FlatList<any>>(null);

  // Debug logging
  useEffect(() => {
    DebugLogger.log('INBOX', 'Component mounted');
    return () => DebugLogger.log('INBOX', 'Component unmounted');
  }, []);

  const analyzeThreadData = useCallback((threads: SmsMessageRecord[]) => {
    if (!__DEV__) return;

    // Check for data issues
    const issues = {
      duplicateAddresses: new Set<string>(),
      invalidTimestamps: 0,
      emptyMessages: 0
    };

    threads.forEach(thread => {
      // Check for duplicate addresses with different IDs
      const sameAddress = threads.filter(t => t.address === thread.address);
      if (sameAddress.length > 1) {
        issues.duplicateAddresses.add(thread.address);
      }

      // Check timestamp validity
      if (thread.timestamp > Date.now() + 60000 || thread.timestamp < 0) { // Allow 1 min slack
        issues.invalidTimestamps++;
      }

      // Check message content
      if (!thread.body || thread.body.trim() === '') {
        issues.emptyMessages++;
      }
    });

    if (issues.duplicateAddresses.size > 0 || issues.invalidTimestamps > 0 || issues.emptyMessages > 0) {
      DebugLogger.warn('INBOX', 'Data Issues Found:', {
        duplicates: issues.duplicateAddresses.size,
        invalidTime: issues.invalidTimestamps,
        empty: issues.emptyMessages
      });
    }
  }, []);

  const loadMessages = useCallback(async () => {
    DebugLogger.log('INBOX', 'Starting inbox load');
    setLoading(true);
    setLastError(null);

    // Check permissions first
    const permissions = await checkSmsPermissions();
    setPermissionStatus(permissions);

    try {
      // Prefetch contacts for name resolution
      await prefetchContacts();
      const data = await fetchInboxMessages();

      DebugLogger.log('INBOX', `Fetched ${data.length} threads`);

      // Analyze for issues in DEV
      analyzeThreadData(data);

      // ⚡ FINAL SORT: Ensure absolutely that new messages are top
      data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setMessages(data);
    } catch (e: any) {
      setLastError(e.message || "Failed to load messages");
      DebugLogger.error('INBOX', 'Load failed', e);
    } finally {
      setLoading(false);
    }
  }, [analyzeThreadData]);

  // Removed redundant useEffect to prevent double-fetch on mount.
  // useFocusEffect handles both initial mount (when focused) and return focus.
  useFocusEffect(
    useCallback(() => {
      DebugLogger.log('INBOX', 'Screen focused - loading messages');
      loadMessages();
    }, [loadMessages])
  );

  // Realtime SMS listener
  useEffect(() => {
    const sub = smsListener.addListener(async (event) => {
      DebugLogger.log('INBOX', 'Realtime SMS received', event);

      // 1. Note: MessageProvider now handles buffering/DB sync globallly.
      // We only need to update the UI optimistically or reload.

      // 2. Update UI optimistically from buffer
      setMessages((prev: SmsMessageRecord[]) => {
        const existing = prev.filter((m: SmsMessageRecord) => m.address !== event.phone);
        // Note: New message replaces thread
        return [
          {
            id: `inbox-${event.timestamp}`,
            address: event.phone,
            body: event.body,
            timestamp: event.timestamp,
            type: "incoming",
          } as SmsMessageRecord, // Type assertion for safety
          ...existing,
        ];
      });

      // 3. Trigger reload to ensure consistency
      // Allow slight delay for MessageProvider to process the buffer
      setTimeout(() => loadMessages(), 1000);
    });

    return () => sub.remove();
  }, [loadMessages]);

  const filteredMessages = useMemo(() => {
    let result = messages;

    if (filter !== "all") result = result.filter((m: SmsMessageRecord) => m.type === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m: SmsMessageRecord) =>
          (m.address || "").toLowerCase().includes(q) ||
          (m.body || "").toLowerCase().includes(q)
      );
    }

    DebugLogger.log('INBOX', `Filtering: ${messages.length} -> ${result.length} (Filter: ${filter}, Search: "${search}")`);
    return result;
  }, [messages, filter, search]);

  const { refreshThreads } = useMessageContext();

  const handleMessagePress = useCallback(async (item: SmsMessageRecord) => {
    const conversation = await getOrCreateConversationFromAddress(item.address);
    router.safePush("ChatScreen", {
      conversationId: conversation.id,
      threadId: item.address,
      address: item.address,
      isNativeSms: true
    });
  }, [router]);

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

  const renderItem = useCallback<ListRenderItem<SmsMessageRecord>>(({ item, index }: { item: SmsMessageRecord; index: number }) => (
    <View style={{ position: 'relative' }}>
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
      {/* DEV ONLY: Debug Index */}
      {__DEV__ && (
        <View style={{ position: 'absolute', right: 0, top: 0, backgroundColor: 'rgba(255,0,0,0.1)', padding: 2 }}>
          <Text style={{ fontSize: 8, color: 'red' }}>{index}</Text>
        </View>
      )}
    </View>
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

        {/* DEBUG HEADER */}
        {__DEV__ && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: colors.subText }}>
              Items: {filteredMessages.length}/{messages.length} | Load: {loading ? 'YES' : 'NO'}
            </Text>
            <TouchableOpacity onPress={() => { loadMessages(); }}>
              <Text style={{ fontSize: 10, color: 'blue', fontWeight: 'bold' }}>FORCE RELD</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Permission Status Banner */}
      {permissionStatus && !permissionStatus.allGranted && (
        <PermissionStatusBanner
          missingPermissions={permissionStatus.missingPermissions}
          impactMessage={permissionStatus.impactMessage}
          variant="warning"
          onDismiss={() => {
            // Re-check permissions after user potentially grants them
            setTimeout(() => loadMessages(), 500);
          }}
        />
      )}

      {lastError && (
        <View style={{ padding: 10, backgroundColor: '#ffeebb' }}>
          <Text style={{ color: '#d00' }}>Error: {lastError}</Text>
          <TouchableOpacity onPress={loadMessages}><Text style={{ fontWeight: 'bold' }}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {/* List — Optimized for bulk updates */}
      <FlatList
        ref={listRef}
        data={filteredMessages}
        // ⚡ Stable key prevents unnecessary re-renders during bulk updates
        keyExtractor={(item: SmsMessageRecord, index) =>
          `${item.address}-${item.timestamp}-${index}`
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadMessages} tintColor={colors.accent} />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}><ActivityIndicator size="large" color={colors.accent} /></View>
          ) : (
            <View style={styles.emptyBox}>
              <Inbox size={48} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>No messages yet</Text>
            </View>
          )
        }
        // ⚡ Virtualization optimizations for high-volume updates
        getItemLayout={(data, index) => (
          { length: 80, offset: 80 * index, index }
        )}
        initialNumToRender={15}
        maxToRenderPerBatch={15}        // Batch more items per render cycle
        updateCellsBatchingPeriod={100} // Batch cell updates every 100ms
        windowSize={21}                  // Render 21 screens worth (10 above + 1 visible + 10 below)
        removeClippedSubviews={true}     // Unmount off-screen components
        // ⚡ Additional performance props
        onEndReachedThreshold={0.5}      // Preload when 50% from end
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
