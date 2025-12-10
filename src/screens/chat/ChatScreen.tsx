// ============================================================================
// 💬 ChatScreen — Chat UI + WhatsApp-like Search System (TS-Stable v4.1 FIXED)
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useMessages } from "@/providers/MessageProvider";
import MessageBubble from "./MessageBubble";
import ChatHeader from "./ChatHeader";
import { getMessagesByThread, markThreadRead } from "@/db/repositories/messages";
import { getThreadDetails, type MessageThread } from "@/db/repositories/threads";
import type { MessageRow } from "@/db/database";

// ---------------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------------

interface ChatScreenProps {
  route: {
    params: {
      threadId: number;
      address: string;
    };
  };
  navigation: any;
}

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { threadId, address } = route.params;

  const { getThreadMessages, sendMessage, markThreadRead } = useMessages();

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [input, setInput] = useState("");

  // -----------------------------
  // Search State
  // -----------------------------
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  const listRef = useRef<FlatList<MessageRow>>(null);

  // -----------------------------
  // Load Thread
  // -----------------------------
  const loadThread = useCallback(async () => {
    const t = await getThreadMessages(Number(threadId));
    setThread(t);
  }, [threadId, getThreadMessages]);

  useEffect(() => {
    loadThread();
    markThreadRead(Number(threadId));

    const timer = setInterval(loadThread, 3000);
    return () => clearInterval(timer);
  }, [loadThread, markThreadRead, threadId]);

  // -----------------------------
  // Header (Search Toggle)
  // -----------------------------
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <ChatHeader
          address={address}
          thread={thread}
          onSearchToggle={() => {
            setSearchOpen((p) => !p);
            setQuery("");
            setMatches([]);
          }}
        />
      ),
    });
  }, [navigation, address, thread]);

  // -----------------------------
  // Search Logic
  // -----------------------------
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
      listRef.current?.scrollToIndex({ index: ids[0], animated: true });
    }
  }, [query, thread]);

  const jumpNext = () => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    listRef.current?.scrollToIndex({ index: matches[next], animated: true });
  };

  const jumpPrev = () => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    listRef.current?.scrollToIndex({ index: matches[prev], animated: true });
  };

  // -----------------------------
  // Send Message
  // -----------------------------
  const handleSend = async () => {
    if (!input.trim()) return;

    await sendMessage({
      address,
      threadId: Number(threadId),
      body: input,
      type: "outgoing",
    });

    setInput("");
    loadThread();

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 180);
  };

  // -----------------------------
  // Render UI
  // -----------------------------
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Search Bar */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search messages..."
            style={styles.searchInput}
          />

          {query.length > 0 && (
            <Text style={styles.counter}>
              {matchIndex + 1}/{matches.length}
            </Text>
          )}

          <TouchableOpacity onPress={jumpPrev} disabled={matches.length === 0}>
            <Text style={styles.navBtn}>⬆️</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={jumpNext} disabled={matches.length === 0}>
            <Text style={styles.navBtn}>⬇️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setMatches([]);
            }}
          >
            <Text style={styles.closeBtn}>✖</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={thread?.messages ?? []}
        keyExtractor={(i) => i.id.toString()}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            isMe={item.type === "outgoing"}
            highlight={
              query.length > 0 &&
              item.body.toLowerCase().includes(query.toLowerCase())
            }
            searchTerm={query}
          />
        )}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          style={styles.input}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  counter: {
    marginHorizontal: 8,
    fontWeight: "600",
    color: "#555",
  },
  navBtn: {
    fontSize: 22,
    marginHorizontal: 4,
  },
  closeBtn: {
    fontSize: 22,
    marginLeft: 6,
    color: "#e11d48",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 0.5,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "700" },
});
