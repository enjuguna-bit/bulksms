// ============================================================================
// 🟩 MessageBubble — WhatsApp-style bubble (TS-Safe + Highlight Support)
// ============================================================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, CheckCheck, Clock } from "lucide-react-native";
import { formatTimestamp } from "@/utils/messageFormatters";
import type { Message } from "@/db/messaging";
import { useThemeSettings } from "@/theme/ThemeProvider";

export interface MessageBubbleProps {
  msg: Message;
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
  const { colors } = useThemeSettings();

  const renderStatus = () => {
    if (!isMe) return null;

    if (msg.status === "pending") return <Clock size={12} color="rgba(255,255,255,0.7)" />;
    if (msg.status === "sent") return <Check size={14} color="rgba(255,255,255,0.7)" />;
    if (msg.status === "delivered") return <CheckCheck size={14} color="rgba(255,255,255,0.7)" />; // delivered
    if (msg.status === "failed") return <Text style={{ fontSize: 10 }}>⚠️</Text>;

    // Read status (Blue ticks) would be conditional color
    return <CheckCheck size={14} color="#53bdeb" />;
  };

  const parts = splitAndHighlight(msg.body || "", searchTerm);

  return (
    <View
      style={[
        styles.bubble,
        isMe ? { backgroundColor: '#005c4b', alignSelf: 'flex-end' } : { backgroundColor: colors.card, alignSelf: 'flex-start' },
        highlight ? styles.highlight : null,
      ]}
    >
      {/* Highlighted message text */}
      <Text style={[styles.text, { color: isMe ? '#fff' : colors.text }]}>
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
        <Text style={[styles.time, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.subText }]}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={{ marginLeft: 4 }}>
          {renderStatus()}
        </View>
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 2,
    gap: 2,
  },
  time: {
    fontSize: 11,
  },
  highlight: {
    borderWidth: 2,
    borderColor: "#fde047", // yellow ring
  },
  highlightText: {
    backgroundColor: "#fef08a",
    fontWeight: "700",
    color: "#000",
  },
});
