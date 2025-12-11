/**
 * ToolsScreen.tsx - Optimized with memoization and improved UX
 */

import React, { memo, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { Send, FileText, BarChart2, ChevronRight } from "lucide-react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

// Memoized tool card component
const ToolCard = memo(
  ({
    title,
    desc,
    icon: Icon,
    color,
    onPress,
  }: {
    title: string;
    desc: string;
    icon: any;
    color: string;
    onPress: () => void;
  }) => {
    const { colors } = useThemeSettings();

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
          <Icon size={24} color={color} strokeWidth={1.5} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.subText }]}>
            {desc}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.subText} />
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.title === next.title &&
    prev.color === next.color &&
    prev.onPress === next.onPress
);

// Memoized header
const ToolsHeader = memo(({ colors }: { colors: any }) => (
  <View style={styles.header}>
    <Text style={[styles.title, { color: colors.text }]}>Tools</Text>
    <Text style={[styles.subtitle, { color: colors.subText }]}>
      Manage your messaging and payments
    </Text>
  </View>
));

export default function ToolsScreen() {
  const router = useSafeRouter();
  const { colors } = useThemeSettings();

  // Memoize tools data to prevent unnecessary re-renders
  const tools = useMemo(
    () => [
      {
        id: "bulk",
        title: "Bulk SMS Pro",
        desc: "Send mass messages to your customers",
        icon: Send,
        route: "BulkPro",
        color: "#2563eb",
      },
      {
        id: "single",
        title: "Single SMS",
        desc: "Send a quick message to one person",
        icon: FileText,
        route: "SendSms",
        color: "#059669",
      },
      {
        id: "transactions",
        title: "Transactions",
        desc: "View payment history and reports",
        icon: BarChart2,
        route: "Transactions",
        color: "#d97706",
      },
    ],
    []
  );

  // Memoize navigation handler
  const handleToolPress = useCallback(
    (route: string) => {
      router.safePush(route as any);
    },
    [router]
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ToolsHeader colors={colors} />

      <View style={styles.grid}>
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            title={tool.title}
            desc={tool.desc}
            icon={tool.icon}
            color={tool.color}
            onPress={() => handleToolPress(tool.route)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
  },
});
