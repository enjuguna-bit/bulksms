// ============================================================
// Dashboard.tsx — Kenyan Business Focus Edition
// ============================================================

import React, { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ListRenderItem,
  ScrollView,
  StatusBar
} from "react-native";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { Card, useToast } from "@/components/ui";
import { EmptyState } from "@/components/shared";
import { useOptimizedList } from "@/hooks/useOptimizedList";
import {
  SkeletonStatCard,
  SkeletonListLoader,
} from "@/components/shared/SkeletonLoader";

import { getSendLogs, type SendLog, clearSendLogs } from "@/services/storage";
import { getContactsList } from "@/services/storage";

import {
  Send,
  Users,
  Calendar,
  FileBarChart,
  MessageCircle,
  Banknote,
  RefreshCw,
  TrendingUp,
  Cloud,
  CalendarDays
} from "lucide-react-native";

import { kenyaColors } from "@/theme/kenyaTheme";
import { NetworkWidget } from "@/components/dashboard/NetworkWidget";
import { KenyaFlag } from "@/components/shared/KenyaFlag";

// Memoized Components

/**
 * Stat Card
 */
const StatCard = memo(
  ({
    label,
    value,
    unit,
    color,
    trend,
    icon: Icon
  }: {
    label: string;
    value: number | string;
    unit?: string;
    color: string;
    trend?: string;
    icon: any;
  }) => {
    return (
      <View style={[styles.statCard, { backgroundColor: color }]}>
        <View style={styles.statHeader}>
          <Icon color="white" size={20} style={{ opacity: 0.9 }} />
          {trend && (
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>{trend}</Text>
            </View>
          )}
        </View>

        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit || ''}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    )
  }
);

/**
 * Quick Action Button
 */
const QuickButton = memo(
  ({
    icon,
    label,
    color,
    onPress,
  }: {
    icon: React.ReactNode;
    label: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.quickButton]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.buttonIcon, { backgroundColor: color }]}>
        {icon}
      </View>
      <Text style={styles.buttonLabel}>{label}</Text>
    </TouchableOpacity>
  )
);

const LogItemComponent = memo(
  ({
    item,
    colors,
  }: {
    item: SendLog;
    colors: any;
  }) => (
    <View style={[styles.logItem, { borderColor: colors.border }]}>
      <View>
        <Text style={[styles.logPhone, { color: colors.text }]}>
          {item.phone}
        </Text>
        <Text style={[styles.logTime, { color: colors.subText }]}>
          {new Date(item.at).toLocaleString('en-KE')}
        </Text>
      </View>
      <Text
        style={[
          styles.logStatus,
          item.status === "SENT"
            ? { color: kenyaColors.statGreen }
            : item.status === "FAILED"
              ? { color: kenyaColors.statRed }
              : { color: kenyaColors.statOrange },
        ]}
      >
        {item.status}
      </Text>
    </View>
  )
);

const StatisticsRow = memo(
  ({
    cards,
  }: {
    cards: any[];
  }) => (
    <View style={styles.row}>
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </View>
  )
);

// Removed JSON.stringify on React Elements which causes crashes/bugs
const QuickActionsGrid = memo(
  ({ actions }: { actions: Array<{ label: string; color: string; route?: string; icon: React.ReactNode, onPress?: () => void }> }) => {
    const router = useSafeRouter();

    return (
      <View style={styles.grid}>
        {actions.map((action) => (
          <View key={action.label} style={styles.gridItem}>
            <QuickButton
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => {
                if (action.onPress) {
                  action.onPress();
                } else if (action.route) {
                  // Explicit cast to any for dynamic route strings
                  router.safePush(action.route as any);
                }
              }}
            />
          </View>
        ))}
      </View>
    );
  }
);

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useSafeRouter(); // Not strictly used here but good practice if we needed to navigate from top level
  const { colors } = useThemeSettings();
  const toast = useToast();

  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Mock data for new widgets
  const [holidays] = useState("Jamhuri Day in 3 days");
  const [weather] = useState("Nairobi: 24°C, Sunny");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [l] = await Promise.all([getSendLogs(), getContactsList()]);
      setLogs(l.reverse());
      if (initialLoad) {
        setInitialLoad(false);
      }
    } catch (e) {
      console.error(e);
      toast.showError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [initialLoad, toast]);

  const handleManualRefresh = useCallback(async () => {
    await loadData();
    toast.showSuccess("Dashboard Updated");
  }, [loadData, toast]);

  const handleClearLogs = useCallback(() => {
    Alert.alert("Confirm", "Clear all logs?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await clearSendLogs();
            setLogs([]);
            toast.showSuccess("Logs cleared");
          } catch (error) {
            toast.showError("Failed to clear logs");
          }
        },
      },
    ]);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, []);

  const total = logs.length;
  const sent = logs.filter((l) => l.status === "SENT").length;
  // Estimate cost: 0.5 KES per SMS
  const cost = sent * 0.5;
  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;

  const renderLogItem: ListRenderItem<SendLog> = useCallback(
    ({ item }) => <LogItemComponent item={item} colors={colors} />,
    [colors]
  );

  const optimizedListProps = useOptimizedList({
    data: logs.slice(0, 30),
    renderItem: renderLogItem,
    keyExtractor: (item, index) => `${item.phone}-${item.at}-${index}`,
    itemHeight: 70,
  });

  // Kenyan Focused Stats
  const statCardsRow1 = [
    {
      label: "SMS Sent Today",
      value: sent,
      unit: "messages",
      color: kenyaColors.statGreen,
      trend: "+12%",
      icon: Send,
    },
    {
      label: "M-Pesa Users",
      value: "142", // Mock for Demo as per request
      unit: "customers",
      color: kenyaColors.statOrange,
      trend: "+5%",
      icon: Users,
    },
  ];

  const statCardsRow2 = [
    {
      label: "Est. Cost Today",
      value: `KES ${cost}`,
      unit: "",
      color: kenyaColors.statRed,
      trend: "-3%",
      icon: Banknote,
    },
    {
      label: "Delivery Rate",
      value: `${deliveryRate}%`,
      unit: "success",
      color: kenyaColors.statBlue,
      trend: "+2%",
      icon: TrendingUp,
    },
  ];

  // Quick Actions from Request
  // Memoize this array to avoid re-renders if possible, but icons are unstable inline.
  // It's better to NOT memoize QuickActionsGrid aggressively if props change.
  const quickActions = [
    {
      icon: <Send color="#fff" size={24} />,
      label: "Send Bulk SMS",
      color: kenyaColors.safaricomGreen,
      route: "BulkPro",
    },
    {
      icon: <Banknote color="#fff" size={24} />,
      label: "M-Pesa Request",
      color: kenyaColors.mpesa,
      route: "Transactions",
    },
    {
      icon: <Users color="#fff" size={24} />,
      label: "Import Contacts",
      color: kenyaColors.importBlue,
      route: "CustomerDatabase",
    },
    {
      icon: <Calendar color="#fff" size={24} />,
      label: "Schedule SMS",
      color: kenyaColors.schedulePurple,
      route: "SmsScheduler", // Fixed route
    },
    {
      icon: <FileBarChart color="#fff" size={24} />,
      label: "Gen. Report",
      color: kenyaColors.reportRed,
      route: "Tools",
    },
    {
      icon: <MessageCircle color="#fff" size={24} />,
      label: "WhatsApp Export @TODO",
      color: kenyaColors.whatsapp,
      onPress: () => Alert.alert("Coming Soon", "WhatsApp Export is under development"),
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: kenyaColors.background }]}>
      <StatusBar backgroundColor={kenyaColors.safaricomGreen} barStyle="light-content" />

      {/* Header */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarTitleContainer}>
          <KenyaFlag width={28} height={20} style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.toolbarTitle}>SMS Dashboard</Text>
            <Text style={styles.toolbarSubtitle}>Kenya Business Edition</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleManualRefresh} style={styles.refreshButton}>
          <RefreshCw color={kenyaColors.safaricomGreen} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Network Monitor Widget - Safaricom Focus */}
        <NetworkWidget />

        {/* Statistics Cards */}
        {loading && initialLoad ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatisticsRow cards={statCardsRow1} />
            <StatisticsRow cards={statCardsRow2} />
          </>
        )}

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <QuickActionsGrid actions={quickActions} />

        {/* Helper Widgets Row */}
        <View style={styles.widgetRow}>
          <View style={styles.miniWidget}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <CalendarDays size={16} color={kenyaColors.safaricomRed} />
              <Text style={styles.miniWidgetTitle}> Events</Text>
            </View>
            <Text style={styles.miniWidgetContent}>{holidays}</Text>
          </View>
          <View style={styles.miniWidget}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Cloud size={16} color={kenyaColors.importBlue} />
              <Text style={styles.miniWidgetTitle}> Weather</Text>
            </View>
            <Text style={styles.miniWidgetContent}>{weather}</Text>
          </View>
        </View>

        {/* Logs Section */}
        <Card variant="elevated" style={styles.logsCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Recent Logs
            </Text>
            <TouchableOpacity onPress={handleClearLogs} disabled={loading}>
              <Text style={{ color: kenyaColors.reportRed, fontWeight: '600' }}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {loading && initialLoad ? (
            <SkeletonListLoader count={3} cardType="simple" />
          ) : logs.length === 0 ? (
            <EmptyState type="logs" />
          ) : (
            <FlatList {...optimizedListProps} scrollEnabled={false} />
          )}
        </Card>

        {/* Bottom padding for ScrollView */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  toolbar: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  toolbarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  toolbarSubtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#F0F9F0',
    borderRadius: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    width: '31%', // 3 items per row approx
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    elevation: 8, // High elevation for Kenyan sun visibility logic
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trendBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: 'white',
  },
  statUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -2,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: 'rgba(255,255,255,0.9)',
  },
  quickButton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    elevation: 4, // Inner pop
  },
  buttonLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: 'center',
    color: '#333',
  },
  widgetRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  miniWidget: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ccc',
    elevation: 2,
  },
  miniWidgetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  miniWidgetContent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  logsCard: {
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: "800",
    fontSize: 18,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 12,
    borderColor: "transparent",
  },
  logPhone: {
    fontWeight: "600",
    fontSize: 15,
  },
  logTime: {
    fontSize: 12,
    marginTop: 4,
  },
  logStatus: {
    fontWeight: "700",
    fontSize: 13,
  },
});