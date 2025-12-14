// ============================================================================
// 💬 ChatScreen — Optimized Chat UI with Search & Debouncing (v5.0) - FIXED
// ============================================================================

import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
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
} from "react-native";

import { useMessages } from "@/providers/MessageProvider";
import MessageBubble from "./MessageBubble";
import ChatHeader from "./ChatHeader";
import { getMessagesByThread, markThreadRead } from "@/db/repositories/messages";
import { getThreadDetails, type MessageThread } from "@/db/repositories/threads";
import type { MessageRow } from "@/db/database";
import { useDebounce } from "@/hooks/useScreenOptimization";
import { useThemeSettings } from "@/theme/ThemeProvider";

// ---------------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------------

interface ChatScreenProps {
  route: {
    params: {
      threadId?: string | number; // ✅ Made optional to handle missing threadId
      address: string;            // ✅ Address is always passed from InboxScreen
    };
  };
  navigation: any;
}

// Memoized message bubble wrapper
const MemoizedMessageBubble = memo(
  ({
    msg,
    isMe,
    highlight,
    searchTerm,
  }: {
    msg: MessageRow;
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
  (prev, next) =>
    prev.msg.id === next.msg.id &&
    prev.highlight === next.highlight &&
    prev.searchTerm === next.searchTerm
);

// Memoized search bar
const SearchBar = memo(
  ({
    query,
    onQueryChange,
    matches,
    matchIndex,
    onPrevPress,
    onNextPress,
    onClose,
    colors,
  }: {
    query: string;
    onQueryChange: (text: string) => void;
    matches: number[];
    matchIndex: number;
    onPrevPress: () => void;
    onNextPress: () => void;
    onClose: () => void;
    colors: any;
  }) => (
    <View style={[styles.searchBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search messages..."
        placeholderTextColor={colors.subText}
        style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
        maxLength={100}
      />

      {query.length > 0 && (
        <Text style={[styles.counter, { color: colors.text }]}>
          {matchIndex + 1}/{matches.length || 0}
        </Text>
      )}

      <TouchableOpacity
        onPress={onPrevPress}
        disabled={matches.length === 0}
        style={{ opacity: matches.length === 0 ? 0.5 : 1 }}
      >
        <Text style={styles.navBtn}>⬆️</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onNextPress}
        disabled={matches.length === 0}
        style={{ opacity: matches.length === 0 ? 0.5 : 1 }}
      >
        <Text style={styles.navBtn}>⬇️</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose}>
        <Text style={styles.closeBtn}>✖</Text>
      </TouchableOpacity>
    </View>
  )
);

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { threadId, address } = route.params;
  const { colors } = useThemeSettings();

  const { getThreadMessages, sendMessage, markThreadRead: markRead } = useMessages();

  // ✅ FIX: Determine effective thread identifier
  // Use threadId if provided, otherwise fall back to address (which is always passed from InboxScreen)
  const effectiveThreadId = threadId ?? address;
  
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryRaw, setQueryRaw] = useState("");
  const query = useDebounce(queryRaw, 300); // Debounce search query
  const [matches, setMatches] = useState<number[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  const listRef = useRef<FlatList<MessageRow>>(null);

  // ✅ FIXED: Load Thread - No Number conversion
  const loadThread = useCallback(async () => {
    try {
      // Use effectiveThreadId (could be number, string, or address)
      const t = await getThreadMessages(effectiveThreadId);
      setThread(t);
    } catch (error) {
      console.error("Failed to load thread:", error);
    }
  }, [effectiveThreadId, getThreadMessages]);

  useEffect(() => {
    loadThread();
    
    // Mark thread as read using the effective identifier
    if (markRead) {
      markRead(effectiveThreadId);
    }

    const timer = setInterval(loadThread, 3000);
    return () => clearInterval(timer);
  }, [loadThread, markRead, effectiveThreadId]);

  // Header Setup
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <ChatHeader
          address={address}
          thread={thread}
          onSearchToggle={() => {
            setSearchOpen((p) => !p);
            setQueryRaw("");
            setMatches([]);
          }}
        />
      ),
    });
  }, [navigation, address, thread]);

  // Optimized Search Logic with useMemo
  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }

    const lower = query.toLowerCase();
    const ids: number[] = [];

    thread?.messages?.forEach((m: MessageRow, idx: number) => {
      if (m.body.toLowerCase().includes(lower)) {
        ids.push(idx);
      }
    });

    setMatches(ids);
    setMatchIndex(0);

    if (ids.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: ids[0], animated: true });
      }, 100);
    }
  }, [query, thread?.messages?.length]);

  const jumpNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    listRef.current?.scrollToIndex({ index: matches[next], animated: true });
  }, [matches, matchIndex]);

  const jumpPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    listRef.current?.scrollToIndex({ index: matches[prev], animated: true });
  }, [matches, matchIndex]);

  // ✅ FIXED: Send Message - Use effectiveThreadId
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage({
        address,
        threadId: effectiveThreadId, // Use effectiveThreadId instead of Number(threadId)
        body: input,
        type: "outgoing",
      });

      setInput("");
      await loadThread();

      setTimeout(
        () => listRef.current?.scrollToEnd({ animated: true }),
        100
      );
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  }, [input, sending, sendMessage, address, effectiveThreadId, loadThread]);

  // Memoized messages with search highlighting
  const highlightedMessages = useMemo(
    () =>
      thread?.messages?.map((msg, idx) => ({
        msg,
        highlight:
          query.length > 0 &&
          msg.body.toLowerCase().includes(query.toLowerCase()),
        searchTerm: query,
      })) ?? [],
    [thread?.messages, query]
  );

  // Render UI
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Search Bar */}
      {searchOpen && (
        <SearchBar
          query={queryRaw}
          onQueryChange={setQueryRaw}
          matches={matches}
          matchIndex={matchIndex}
          onPrevPress={jumpPrev}
          onNextPress={jumpNext}
          onClose={() => {
            setQueryRaw("");
            setMatches([]);
            setSearchOpen(false);
          }}
          colors={colors}
        />
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={thread?.messages ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
          const highlighted = highlightedMessages[index];
          return (
            <MemoizedMessageBubble
              msg={item}
              isMe={item.type === "outgoing"}
              highlight={highlighted?.highlight || false}
              searchTerm={highlighted?.searchTerm || ""}
            />
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      />

      {/* Input */}
      <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          placeholderTextColor={colors.subText}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border },
          ]}
          editable={!sending}
          maxLength={160}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { opacity: sending || !input.trim() ? 0.6 : 1 },
          ]}
          onPress={handleSend}
          disabled={sending || !input.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  counter: {
    fontWeight: "600",
    fontSize: 12,
    minWidth: 40,
    textAlign: "center",
  },
  navBtn: {
    fontSize: 20,
  },
  closeBtn: {
    fontSize: 20,
    color: "#e11d48",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 0.5,
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  sendText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});