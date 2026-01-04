/**
 * ToolsScreen.tsx - Kenyan Advanced SMS Utilities
 */

import React, { memo, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import {
  Send,
  FileText,
  BarChart2,
  ChevronRight,
  Calendar,
  Copy,
  Banknote,
  TrendingUp,
  Trash2,
  Archive,
  MessageSquare,
  Layers,
  MapPin,
  Languages,
  FileDigit,
  Clock,
  Search
} from "lucide-react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { Card } from "@/components/ui";
import { kenyaColors } from "@/theme/kenyaTheme";
import { KenyaFlag } from "@/components/shared/KenyaFlag";

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
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.subText }]} numberOfLines={2}>
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

// Kenyan Special Tool Card
const KenyanToolCard = memo(
  ({
    title,
    desc,
    icon: Icon,
    onPress,
  }: {
    title: string;
    desc: string;
    icon: any;
    onPress: () => void;
  }) => {
    const { colors } = useThemeSettings();

    return (
      <TouchableOpacity
        style={styles.kenyanCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.kenyanCardHeader}>
          <View style={styles.kenyanIconContainer}>
            <Icon size={20} color={kenyaColors.safaricomGreen} />
          </View>
          <KenyaFlag width={20} height={14} />
        </View>

        <Text style={styles.kenyanTitle}>{title}</Text>
        <Text style={styles.kenyanDesc}>{desc}</Text>
      </TouchableOpacity>
    );
  }
);

export default function ToolsScreen() {
  const router = useSafeRouter();
  const { colors } = useThemeSettings();
  const [searchQuery, setSearchQuery] = useState("");

  const handleAlert = (feature: string) => {
    Alert.alert(feature, "This feature is coming soon to the Kenya Edition.");
  };

  // Standard Tools
  const tools = useMemo(
    () => [
      {
        id: "schedule",
        title: "Schedule Bulk SMS",
        desc: "Plan SMS campaigns for optimal Kenyan time zones",
        icon: Calendar,
        route: "SmsScheduler",
        color: kenyaColors.schedulePurple,
      },
      {
        id: "templates",
        title: "Message Templates",
        desc: "Save Swahili/English templates for quick sending",
        icon: Copy,
        action: () => handleAlert("Templates"),
        color: colors.primary600,
      },
      {
        id: "mpesa_bulk",
        title: "M-Pesa Bulk Request",
        desc: "Send payment requests to multiple contacts",
        icon: Banknote,
        action: () => router.safePush("Transactions" as any), // Reuse transactions for now
        color: kenyaColors.mpesa,
      },
      {
        id: "analyzer",
        title: "SMS Analyzer",
        desc: "Analyze SMS costs and delivery rates",
        icon: TrendingUp,
        action: () => handleAlert("SMS Analyzer"),
        color: kenyaColors.statBlue,
      },
      {
        id: "cleaner",
        title: "Contact Cleaner",
        desc: "Remove duplicates and invalid Kenyan numbers",
        icon: Trash2,
        action: () => router.safePush("CustomerDatabase" as any),
        color: kenyaColors.statRed,
      },
      {
        id: "trans_cleaner",
        title: "Transaction Cleaner",
        desc: "Find and remove duplicate M-Pesa records",
        icon: Trash2,
        action: () => router.safePush("TransactionCleaner" as any),
        color: "#ca8a04", // Yellow/Gold
      },
      {
        id: "backup",
        title: "SMS Backup",
        desc: "Backup SMS conversations securely",
        icon: Archive,
        action: () => handleAlert("Backup"),
        color: "#64748b",
      },
    ],
    [colors, router]
  );

  // Kenyan Special Tools
  const kenyanTools = [
    {
      title: "County Broadcast",
      desc: "Send SMS by Kenyan county",
      icon: MapPin,
      route: null,
    },
    {
      title: "Swahili Translator",
      desc: "Translate SMS to Swahili",
      icon: Languages,
      route: null,
    },
    {
      title: "M-Pesa Statements",
      desc: "Parse M-Pesa PDF statements",
      icon: FileDigit,
      route: "MpesaParserScreen",
    },
    {
      title: "Financial Scanner",
      desc: "Scan Inbox for M-Pesa/Bank SMS",
      icon: Search,
      route: "InboxScanner",
    },
    {
      title: "Business Hours",
      desc: "Respect 8AM-5PM rules",
      icon: Clock,
      route: null,
    }
  ];

  const filteredTools = tools.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header with Search */}
      <View style={[styles.header, { backgroundColor: kenyaColors.safaricomGreen }]}>
        <View>
          <Text style={styles.headerTitle}>SMS Tools</Text>
          <Text style={styles.headerSubtitle}>
            Advanced Utilities for Kenya
          </Text>
        </View>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search tools..."
            style={styles.searchInput}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.content}>
        {/* Kenyan Special Tools Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kenya Special Tools</Text>
        <View style={styles.kenyanGrid}>
          {kenyanTools.map((tool, idx) => (
            <KenyanToolCard
              key={idx}
              {...tool}
              onPress={() => tool.route ? router.safePush(tool.route as any) : handleAlert(tool.title)}
            />
          ))}
        </View>

        {/* Standard Tools List */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Management Tools</Text>
        <View style={styles.grid}>
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              title={tool.title}
              desc={tool.desc}
              icon={tool.icon}
              color={tool.color}
              onPress={() => tool.route ? router.safePush(tool.route as any) : tool.action && tool.action()}
            />
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
  },
  searchBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#333',
  },
  content: { // Changed from container to content for padding
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  grid: {
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
  cardContent: {
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
  kenyanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kenyanCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: kenyaColors.safaricomGreen,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 4,
  },
  kenyanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  kenyanIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kenyanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  kenyanDesc: {
    fontSize: 11,
    color: '#666',
    lineHeight: 14,
  }
});
