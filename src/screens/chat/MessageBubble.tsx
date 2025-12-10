// ============================================================================
// 🟩 MessageBubble — WhatsApp-style bubble (TS-Safe + Highlight Support)
// ============================================================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatTimestamp } from "@/utils/messageFormatters";
import type { MessageRow } from "@/db/database";

export interface MessageBubbleProps {
  msg: MessageRow;
  isMe: boolean;
  highlight?: boolean;
  searchTerm?: string;
}

// Highlight matched text inside message body
function splitAndHighlight(text: string, term: string) {
  if (!term || !term.trim()) return [text];

  const regex = new RegExp(`(${term})`, "gi");
  return text.split(regex);
}

export default function MessageBubble({
  msg,
  isMe,
  highlight,
  searchTerm = "",
}: MessageBubbleProps) {
  const statusIcon =
    msg.status === "sent"
      ? "✓"
      : msg.status === "delivered"
        ? "✓✓"
        : msg.status === "failed"
          ? "⚠️"
          : "";

  const parts = splitAndHighlight(msg.body, searchTerm);

  return (
    <View
      style={[
        styles.bubble,
        isMe ? styles.myBubble : styles.theirBubble,
        highlight ? styles.highlight : null,
      ]}
    >
      {/* Highlighted message text */}
      <Text style={[styles.text, isMe && styles.myText]}>
        {parts.map((p, idx) => {
          const isMatch =
            searchTerm &&
            p.toLowerCase() === searchTerm.toLowerCase();

          return (
            <Text
              key={idx}
              style={isMatch ? styles.highlightText : undefined}
            >
              {p}
            </Text>
          );
        })}
      </Text>

      {/* Footer: time + status */}
      <View style={styles.footer}>
        <Text style={styles.time}>{formatTimestamp(msg.timestamp)}</Text>
        {isMe && <Text style={styles.status}>{statusIcon}</Text>}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#4f46e5",
  },
  myText: {
    color: "#fff",
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
  },
  text: {
    color: "#111",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: "#444",
  },
  status: {
    fontSize: 11,
    color: "#fff",
    marginLeft: 4,
  },

  // 🔍 Highlight bubble border
  highlight: {
    borderWidth: 2,
    borderColor: "#fde047", // yellow ring
  },

  // 🔍 Highlight matched text inside bubble
  highlightText: {
    backgroundColor: "#fef08a",
    fontWeight: "700",
  },
});
