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
  StatusBar,
  RefreshControl,
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
import { getMpesaStats } from "@/db/repositories/mpesaTransactions";

import {
  Send,
  Users,
  Calendar,
  FileBarChart,
  MessageCircle,
  Banknote,
  RefreshCw,
  TrendingUp,
} from "lucide-react-native";

import { kenyaColors } from "@/theme/kenyaTheme";
import { NetworkWidget } from "@/components/dashboard/NetworkWidget";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { QuotesWidget } from "@/components/dashboard/QuotesWidget";
import { KenyaFlag } from "@/components/shared/KenyaFlag";
import AnimatedStatCard from '@/components/dashboard/AnimatedStatCard';
import SmsVolumeChart from '@/components/dashboard/SmsVolumeChart';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PerformanceWidgets from '@/components/dashboard/PerformanceWidgets';

import type { GradientColorKey } from '@/components/dashboard/AnimatedStatCard';

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
    color: GradientColorKey;
    trend?: string;
    icon: any;
  }) => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;

    return (
      <AnimatedStatCard
        value={numericValue}
        label={label}
        color={color}
        unit={unit}
        trend={trend}
      />
    );
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

type ChartData = {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
  }>;
};

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
  const [mpesaUserCount, setMpesaUserCount] = useState<number>(0);
  const [yesterdaySent, setYesterdaySent] = useState<number>(0);

  const [stats, setStats] = useState({
    sent: 0,
    mpesaUsers: 0,
    deliveryRate: 0,
    messagesPerMinute: 0,
    cost: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [120, 190, 300, 250, 280, 220, 180]
    }]
  });

  interface ActivityItem {
    id: string;
    type: 'sms' | 'mpesa';
    status: 'success' | 'failed' | 'pending';
    phone: string;
    timestamp: number;
    amount?: number;
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [l, mpesaStats] = await Promise.all([
        getSendLogs(),
        getMpesaStats().catch(() => ({ uniquePhones: 0 })),
      ]);
      setLogs(l.reverse());
      setMpesaUserCount(mpesaStats.uniquePhones || 0);

      // Calculate yesterday's sent for trend
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      const yesterdayCount = l.filter(
        (log) => new Date(log.at).toDateString() === yesterdayStr && log.status === "SENT"
      ).length;
      setYesterdaySent(yesterdayCount);

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
  }, [loadData]);

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

  // Calculate real trends based on yesterday's data
  const smsTrend = yesterdaySent > 0
    ? Math.round(((sent - yesterdaySent) / yesterdaySent) * 100)
    : 0;
  const smsTrendStr = smsTrend >= 0 ? `+${smsTrend}%` : `${smsTrend}%`;

  // Kenyan Focused Stats with real data
  const statCardsRow1 = [
    {
      label: "SMS Sent Today",
      value: sent,
      unit: "messages",
      color: "statGreen",
      trend: smsTrendStr,
      icon: Send,
    },
    {
      label: "M-Pesa Users",
      value: mpesaUserCount,
      unit: "customers",
      color: "statOrange",
      trend: mpesaUserCount > 0 ? "Active" : "",
      icon: Users,
    },
  ];

  const statCardsRow2 = [
    {
      label: "Est. Cost Today",
      value: `KES ${cost}`,
      unit: "",
      color: "statRed",
      trend: cost > 0 ? "Safaricom" : "",
      icon: Banknote,
    },
    {
      label: "Delivery Rate",
      value: `${deliveryRate}%`,
      unit: "success",
      color: "statBlue",
      trend: deliveryRate >= 90 ? "Excellent" : deliveryRate >= 70 ? "Good" : "",
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

  const loadNewData = useCallback(async () => {
    // Simulate data loading
    setStats({
      sent: 245,
      mpesaUsers: 189,
      deliveryRate: 92,
      messagesPerMinute: 4.2,
      cost: 122.5
    });

    setActivities([
      { id: '1', type: 'sms', status: 'success', phone: '+254712345678', timestamp: Date.now() - 10000 },
      { id: '2', type: 'mpesa', status: 'success', phone: '+254712345679', timestamp: Date.now() - 30000, amount: 1500 },
      { id: '3', type: 'sms', status: 'failed', phone: '+254712345670', timestamp: Date.now() - 45000 }
    ]);
  }, []);

  useEffect(() => {
    loadNewData();
  }, [loadNewData]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={kenyaColors.safaricomGreen} barStyle="light-content" />

      {/* Modern Header Section */}
      <View style={[styles.headerSection, { backgroundColor: 'rgba(67,176,42,0.08)' }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Dashboard
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
                Business Overview
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleManualRefresh}
              style={[styles.refreshButton, { backgroundColor: kenyaColors.safaricomGreen }]}
              disabled={loading}
            >
              <RefreshCw
                size={20}
                color="#fff"
                style={loading ? styles.spinningIcon : undefined}
              />
            </TouchableOpacity>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Welcome back! Here's your business at a glance.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleManualRefresh}
            colors={[kenyaColors.safaricomGreen]}
            tintColor={kenyaColors.safaricomGreen}
          />
        }
      >

        {/* Inspirational Quote Widget */}
        <QuotesWidget />

        {/* Network Monitor Widget - Safaricom Focus */}
        <NetworkWidget />

        {/* Statistics Cards with Modern Layout */}
        {loading && initialLoad ? (
          <View style={styles.statsSkeleton}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <StatisticsRow cards={statCardsRow1} />
            <StatisticsRow cards={statCardsRow2} />
          </View>
        )}

        {/* Analytics Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: '900' }]}>
            📊 Analytics
          </Text>
          <SmsVolumeChart data={chartData} />
        </View>

        {/* Performance & Activity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontWeight: '900' }]}>
            ⚡ Performance
          </Text>
          <PerformanceWidgets
            deliveryRate={stats.deliveryRate}
            messagesPerMinute={stats.messagesPerMinute}
            estimatedCost={stats.cost}
          />

          <ActivityFeed activities={activities} />
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🚀 Quick Actions
          </Text>
          <QuickActionsGrid actions={quickActions} />
        </View>

        {/* Widgets Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📱 Widgets
          </Text>
          <View style={styles.widgetRow}>
            <CalendarWidget compact />
            <WeatherWidget compact />
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Card variant="elevated" style={styles.logsCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                📋 Recent Activity
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
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },

  // Modern Header Section
  headerSection: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  welcomeSection: {
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },

  // Modern Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    marginTop: 8,
  },

  // Statistics
  statsContainer: {
    marginBottom: 24,
  },
  statsSkeleton: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },

  // Quick Actions
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  gridItem: {
    width: '31%',
    marginBottom: 8,
  },
  quickButton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: 'center',
    color: '#333',
    lineHeight: 14,
  },

  // Widgets
  widgetRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },

  // Activity Logs
  logsCard: {
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  // Log Items
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  logPhone: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  logTime: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  logStatus: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Legacy styles (keeping for compatibility)
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
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    elevation: 8,
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
});