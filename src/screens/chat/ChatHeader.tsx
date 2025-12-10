// ============================================================================
// 👤 ChatHeader — WhatsApp-style chat header UI (TS-Safe + Search Button)
// ============================================================================

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { ChevronLeft, Search } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import { markThreadRead } from "@/db/repositories/messages";
import type { MessageThread } from "@/db/repositories/threads";

export interface ChatHeaderProps {
  address: string;
  thread: MessageThread | null;
  onSearchToggle?: () => void; // ← NEW, NECESSARY FOR ChatScreen
}

export default function ChatHeader({
  address,
  thread,
  onSearchToggle,
}: ChatHeaderProps) {
  const navigation = useNavigation();

  // -----------------------------------------
  // Last seen logic
  // -----------------------------------------
  let status = "Online";

  if (thread?.lastTimestamp) {
    const last = new Date(thread.lastTimestamp);
    const now = Date.now();

    // last seen > 4 minutes ago
    if (now - thread.lastTimestamp > 4 * 60 * 1000) {
      status =
        "Last seen " +
        last.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  }

  return (
    <View style={styles.header}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={26} color="#fff" />
      </TouchableOpacity>

      {/* Avatar: last 2 digits of phone */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {address.substring(address.length - 2)}
        </Text>
      </View>

      {/* Title */}
      <View style={styles.info}>
        <Text style={styles.name}>{address}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      {/* Search button */}
      <TouchableOpacity
        style={styles.searchBtn}
        onPress={onSearchToggle}
        disabled={!onSearchToggle}
      >
        <Search size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: "#4f46e5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    elevation: 4,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: "#312e81",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  info: {
    flexDirection: "column",
    flex: 1,
  },
  name: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  status: {
    color: "#e0e7ff",
    fontSize: 12,
  },
  searchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
