// ============================================================
// Dashboard.tsx — Optimized with memoization & skeleton loaders
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
} from "react-native";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { Card, Button, useToast } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/shared";
import { useOptimizedList } from "@/hooks/useOptimizedList";
import {
  SkeletonCard,
  SkeletonStatCard,
  SkeletonListLoader,
} from "@/components/shared/SkeletonLoader";

import { getSendLogs, type SendLog, clearSendLogs } from "@/services/storage";
import { getContactsList } from "@/services/storage";

import {
  FileText,
  Send,
  BarChart2,
  Users,
  Trash2,
  RefreshCcw,
  Smartphone,
  Settings,
} from "lucide-react-native";

// Memoized Components
const StatCard = memo(
  ({
    label,
    value,
    color,
    gradient,
  }: {
    label: string;
    value: number | string;
    color: string;
    gradient: string[];
  }) => (
    <View style={[styles.statCard, { backgroundColor: color + "15" }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  ),
  (prev, next) =>
    prev.label === next.label &&
    prev.value === next.value &&
    prev.color === next.color
);

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
      style={[styles.quickButton, { backgroundColor: color + "15" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.buttonIcon, { backgroundColor: color }]}>
        {icon}
      </View>
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  ),
  (prev, next) =>
    prev.label === next.label &&
    prev.color === next.color
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
          {new Date(item.at).toLocaleString()}
        </Text>
      </View>
      <Text
        style={[
          styles.logStatus,
          item.status === "SENT"
            ? { color: colors.success }
            : item.status === "FAILED"
              ? { color: colors.error }
              : { color: colors.warning },
        ]}
      >
        {item.status}
      </Text>
    </View>
  ),
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.status === next.item.status
);

const StatisticsRow = memo(
  ({
    cards,
    colors,
  }: {
    cards: { label: string; value: number; color: string; gradient: string[] }[];
    colors: any;
  }) => (
    <View style={styles.row}>
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </View>
  ),
  (prev, next) =>
    JSON.stringify(prev.cards) === JSON.stringify(next.cards)
);

const QuickActionsRow = memo(
  ({ actions }: { actions: Array<{ label: string; color: string; route: string; icon: React.ReactNode }> }) => {
    const router = useSafeRouter();
    return (
      <View style={styles.quickRow}>
        {actions.map((action) => (
          <QuickButton
            key={action.label}
            icon={action.icon}
            label={action.label}
            color={action.color}
            onPress={() => router.safePush(action.route as any)}
          />
        ))}
      </View>
    );
  },
  (prev, next) => JSON.stringify(prev.actions) === JSON.stringify(next.actions)
);

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useSafeRouter();
  const { colors } = useThemeSettings();
  const toast = useToast();

  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadData = useCallback(async (isManual = false) => {
    try {
      setLoading(true);
      const [l] = await Promise.all([getSendLogs(), getContactsList()]);
      setLogs(l.reverse());
      if (initialLoad) {
        setInitialLoad(false);
      }
      // Only show success toast on manual refresh
      if (isManual === true) {
        toast.showSuccess("Dashboard Updated");
      }
    } catch (e) {
      console.error(e);
      toast.showError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [initialLoad, toast]);

  const handleManualRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

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
            toast.showSuccess("All logs cleared successfully");
          } catch (error) {
            toast.showError("Failed to clear logs");
          }
        },
      },
    ]);
  }, [toast]);

  useEffect(() => {
    loadData(false);
  }, []); // Remove loadData dependency to prevent loop if references result in instability

  const total = logs.length;
  const sent = logs.filter((l) => l.status === "SENT").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;
  const unsupported = logs.filter((l) => l.status === "UNSUPPORTED").length;

  const renderLogItem: ListRenderItem<SendLog> = useCallback(
    ({ item }) => <LogItemComponent item={item} colors={colors} />,
    [colors]
  );

  const optimizedListProps = useOptimizedList({
    data: logs.slice(0, 30),
    renderItem: renderLogItem,
    keyExtractor: (item, index) => `${item.phone}-${item.at}-${index}`,
    itemHeight: 60,
  });

  const statCards = [
    {
      label: "Total Logs",
      value: total,
      color: "#0ea5e9",
      gradient: colors.gradientPrimary,
    },
    {
      label: "Sent",
      value: sent,
      color: "#16a34a",
      gradient: colors.gradientSuccess,
    },
  ];

  const statCards2 = [
    {
      label: "Failed",
      value: failed,
      color: "#dc2626",
      gradient: colors.gradientError,
    },
    {
      label: "Unsupported",
      value: unsupported,
      color: "#ca8a04",
      gradient: colors.gradientWarning,
    },
  ];

  const quickActions = [
    {
      icon: <Send color="#fff" size={20} />,
      label: "Bulk SMS",
      color: "#2563eb",
      route: "BulkPro",
    },
    {
      icon: <FileText color="#fff" size={20} />,
      label: "Single SMS",
      color: "#16a34a",
      route: "SendSms",
    },
  ];

  const quickActions2 = [
    {
      icon: <Users color="#fff" size={20} />,
      label: "Customers",
      color: "#0ea5e9",
      route: "CustomerDatabase",
    },
    {
      icon: <BarChart2 color="#fff" size={20} />,
      label: "Transactions",
      color: "#9333ea",
      route: "Transactions",
    },
  ];

  const quickActions3 = [
    {
      icon: <Smartphone color="#fff" size={20} />,
      label: "Monitor",
      color: "#f59e0b",
      route: "Transactions",
    },
    {
      icon: <Settings color="#fff" size={20} />,
      label: "Settings",
      color: "#64748b",
      route: "Settings",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.subText }]}>
        Monitor activity and navigate across modules
      </Text>

      {/* Statistics Cards */}
      {loading && initialLoad ? (
        <>
          <SkeletonStatCard />
          <SkeletonStatCard />
        </>
      ) : (
        <>
          <StatisticsRow cards={statCards} colors={colors} />
          <StatisticsRow cards={statCards2} colors={colors} />
        </>
      )}

      {/* Quick Actions Section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Quick Actions
      </Text>

      {loading && initialLoad ? (
        <>
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
        </>
      ) : (
        <>
          <QuickActionsRow actions={quickActions} />
          <QuickActionsRow actions={quickActions2} />
          <QuickActionsRow actions={quickActions3} />
        </>
      )}

      {/* Logs Section */}
      <Card variant="elevated" style={styles.logsCard}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Recent Logs
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={handleManualRefresh} disabled={loading}>
              <RefreshCcw
                color={loading ? colors.border : colors.accent}
                size={20}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearLogs} disabled={loading}>
              <Trash2
                color={loading ? colors.border : colors.error}
                size={20}
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading && initialLoad ? (
          <SkeletonListLoader count={3} cardType="simple" />
        ) : logs.length === 0 ? (
          <EmptyState type="logs" />
        ) : (
          <FlatList {...optimizedListProps} />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 20,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  skeletonRow: {
    height: 60,
    marginBottom: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    marginTop: 16,
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  quickButton: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  logsCard: {
    marginTop: 24,
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
    fontSize: 13,
    marginTop: 2,
  },
  logStatus: {
    fontWeight: "700",
    fontSize: 14,
  },
});
