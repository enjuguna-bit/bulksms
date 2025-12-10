// -----------------------------------------------------
// app/dashboard.tsx — Dashboard (with ProtectedRoute)
// React Navigation version (no expo-router)
// -----------------------------------------------------

import React, { useEffect, useState, useCallback } from "react";
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

// Components
import { StatCard } from "@/components/StatCard";
import { QuickButton } from "@/components/QuickButton";

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
  const [loading, setLoading] = useState(false);
  // const [contacts, setContacts] = useState<any[]>([]); // Unused for now, but kept if needed later

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Parallel fetch if we need contacts later
      const [l] = await Promise.all([getSendLogs(), getContactsList()]);
      setLogs(l.reverse());
      // setContacts(c);
      toast.showSuccess("Dashboard data refreshed");
    } catch (e) {
      console.error(e);
      toast.showError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
    loadData();
  }, [loadData]);

  const total = logs.length;
  const sent = logs.filter((l) => l.status === "SENT").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;
  const unsupported = logs.filter((l) => l.status === "UNSUPPORTED").length;

  const renderLogItem: ListRenderItem<SendLog> = useCallback(
    ({ item }) => (
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
    [colors]
  );

  const optimizedListProps = useOptimizedList({
    data: logs.slice(0, 30),
    renderItem: renderLogItem,
    keyExtractor: (item, index) => `${item.phone}-${item.at}-${index}`,
    itemHeight: 60,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.subText }]}>
        Monitor activity and navigate across modules
      </Text>

      {/* ===== Summary Cards ===== */}
      <View style={styles.row}>
        <StatCard 
          label="Total Logs" 
          value={total} 
          color="#0ea5e9" 
          gradient={colors.gradientPrimary}
        />
        <StatCard 
          label="Sent" 
          value={sent} 
          color="#16a34a" 
          gradient={colors.gradientSuccess}
        />
      </View>
      <View style={styles.row}>
        <StatCard 
          label="Failed" 
          value={failed} 
          color="#dc2626" 
          gradient={colors.gradientError}
        />
        <StatCard 
          label="Unsupported" 
          value={unsupported} 
          color="#ca8a04" 
          gradient={colors.gradientWarning}
        />
      </View>

      {/* ===== Quick Links ===== */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Quick Actions
      </Text>

      <View style={styles.quickRow}>
        <QuickButton
          icon={<Send color="#fff" size={20} />}
          label="Bulk SMS"
          color="#2563eb"
          gradient={colors.gradientPrimary}
          hapticType="medium"
          onPress={() => router.safePush("BulkPro")}
        />
        <QuickButton
          icon={<FileText color="#fff" size={20} />}
          label="Single SMS"
          color="#16a34a"
          gradient={colors.gradientSuccess}
          hapticType="light"
          onPress={() => router.safePush("SendSms")}
        />
      </View>

      <View style={styles.quickRow}>
        <QuickButton
          icon={<Users color="#fff" size={20} />}
          label="Customers"
          color="#0ea5e9"
          gradient={["#0ea5e9", "#0284c7"]}
          hapticType="light"
          onPress={() => router.safePush("CustomerDatabase")}
        />
        <QuickButton
          icon={<BarChart2 color="#fff" size={20} />}
          label="Transactions"
          color="#9333ea"
          gradient={["#9333ea", "#7c3aed"]}
          hapticType="light"
          onPress={() => router.safePush("Transactions")}
        />
      </View>

      <View style={styles.quickRow}>
        <QuickButton
          icon={<Smartphone color="#fff" size={20} />}
          label="Monitor"
          color="#f59e0b"
          gradient={colors.gradientWarning}
          hapticType="warning"
          onPress={() => router.safePush("Transactions")}
        />
        <QuickButton
          icon={<Settings color="#fff" size={20} />}
          label="Settings"
          color="#64748b"
          gradient={["#64748b", "#475569"]}
          hapticType="light"
          onPress={() => router.safeReplace("Settings")}
        />
      </View>

      {/* ===== Logs Section ===== */}
      <Card variant="elevated" style={styles.logsCard}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Recent Logs
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={loadData}>
              <RefreshCcw color={colors.accent} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearLogs}>
              <Trash2 color={colors.error} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <LoadingSpinner size="large" />
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
    borderColor: 'transparent',
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
