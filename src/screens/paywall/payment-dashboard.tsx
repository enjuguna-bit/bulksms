// -------------------------------------------------------------
// 💳 Payment Dashboard — Stable v2.0
// -------------------------------------------------------------
import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

// ❌ Expo version removed
// import { LinearGradient } from "expo-linear-gradient";

// ✅ RN CLI version
// ✅ RN CLI version
// import LinearGradient from "react-native-linear-gradient";

import { usePaymentCapture } from "@/hooks/usePaymentCapture";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function PaymentDashboard() {
  const { colors } = useThemeSettings();

  const {
    filteredRecords,
    totalAmount,
    loading,
    handleManualRefresh,
    fetchServerTransactions,
  } = usePaymentCapture();

  // Sort newest first
  const sortedRecords = [...filteredRecords].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );

  const bgColor = colors.background;
  const textColor = colors.text;
  const subTextColor = colors.subText;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.headerText, { color: textColor }]}>
        💰 Total Amount: KES {totalAmount.toLocaleString()}
      </Text>
      <Text style={[styles.countText, { color: subTextColor }]}>
        Showing {sortedRecords.length} transactions
      </Text>

      {/* 🔁 Server Sync Button */}
      <TouchableOpacity
        onPress={fetchServerTransactions}
        activeOpacity={0.85}
        style={styles.syncButton}
        disabled={loading}
      >
        <View
          style={[styles.gradientButton, { backgroundColor: "#2563eb" }]}
        >
          <Text style={styles.syncText}>
            {loading ? "⏳ Syncing..." : "🔁 Sync Server Payments"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 📲 Full Refresh Button */}
      <TouchableOpacity
        onPress={handleManualRefresh}
        activeOpacity={0.85}
        style={styles.refreshButton}
        disabled={loading}
      >
        <View
          style={[styles.gradientButton, { backgroundColor: "#16a34a" }]}
        >
          <Text style={styles.syncText}>
            {loading ? "⏳ Refreshing..." : "📲 Refresh Inbox + Server"}
          </Text>
        </View>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {/* 📭 Empty state */}
      {!loading && sortedRecords.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: textColor }]}>
            No payments found 📭
          </Text>
          <Text style={[styles.emptySubText, { color: subTextColor }]}>
            Try refreshing to sync recent transactions.
          </Text>
        </View>
      )}

      <FlatList
        data={sortedRecords}
        keyExtractor={(item, index) => item.id ? String(item.id) : `payment-${index}`}
        refreshing={loading}
        onRefresh={handleManualRefresh}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => console.log("Open transaction details", item.id)}
            style={styles.recordItem}
          >
            <View>
              <Text style={[styles.recordName, { color: textColor }]}>
                {item.name}
              </Text>
              <Text style={[styles.recordPhone, { color: subTextColor }]}>
                {item.phone}
              </Text>
            </View>
            <Text style={[styles.recordDate, { color: subTextColor }]}>
              {new Date(item.lastSeen).toLocaleDateString()}{" "}
              {new Date(item.lastSeen).toLocaleTimeString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  countText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  syncButton: { marginBottom: 12 },
  refreshButton: { marginBottom: 16 },
  gradientButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  syncText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  recordItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recordName: { fontWeight: "600" },
  recordPhone: {},
  recordDate: { fontSize: 12 },
  emptyState: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    marginTop: 4,
    fontSize: 14,
  },
});
