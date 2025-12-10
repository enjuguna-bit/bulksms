// -----------------------------------------------------------
// Customer Database Screen — Performance & Theme Optimized
// -----------------------------------------------------------
// ✔ FlatList
// ✔ Dark Mode / Light Mode support
// ✔ No nested ScrollViews (Fixes virtualization warnings)
// -----------------------------------------------------------

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ReactNativeBlobUtil from "react-native-blob-util";
import Share from "react-native-share";
import { toCsv } from "@/utils/csvParser";
import Toast from "react-native-toast-message";

import ProtectedRoute from "@/components/ProtectedRoute";
import { getCustomers, getSendLogs, clearAllData } from "@/services/storage";
import { useThemeSettings } from "@/theme/ThemeProvider";
import type { Customer, SendResult } from "@/types";

// ======================================================
// 📌 Customer Card (Themed)
// ======================================================
function CustomerCard({ item, colors }: { item: Customer; colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderLeftColor: colors.accent }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.customerName, { color: colors.text }]}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: colors.chip }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            {item.transactions?.length ?? 0} txn
          </Text>
        </View>
      </View>

      <Text style={[styles.phone, { color: colors.subText }]}>
        📱 {(item as any).phone ?? ""}
      </Text>
      <Text style={[styles.date, { color: colors.subText }]}>
        Since: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );
}

// ======================================================
// 📄 Main Screen
// ======================================================
export default function CustomerDatabase(): JSX.Element {
  return (
    <ProtectedRoute>
      <CustomerDatabaseContent />
    </ProtectedRoute>
  );
}

function CustomerDatabaseContent(): JSX.Element {
  const { colors } = useThemeSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<SendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [cust, lg] = await Promise.all([getCustomers(), getSendLogs()]);
      setCustomers(cust as Customer[]);
      setLogs(lg as SendResult[]);
    } catch (err) {
      console.error("Load Data Error:", err);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    Toast.show({ type: "success", text1: "Data refreshed" });
  };

  const handleExport = async () => {
    if (customers.length === 0 && logs.length === 0) {
      return Alert.alert("No Data", "No customers or logs to export.");
    }
    try {
      const exportCustomers = customers.map((c) => ({
        Name: c.name,
        Phone: (c as any).phone ?? "",
        "Total Transactions": c.transactions?.length ?? 0,
        "Customer Since": new Date(c.createdAt).toLocaleDateString(),
      }));

      const exportLogs = logs.map((l) => ({
        Phone: l.phone,
        Status: l.status,
        Date: new Date(l.at).toLocaleString(),
        Error: l.error ?? "",
      }));

      // Combine both into one CSV with section headers
      const customersCSV = toCsv(exportCustomers);
      const logsCSV = toCsv(exportLogs);
      const combinedCSV = `CUSTOMERS\n${customersCSV}\n\nSEND LOGS\n${logsCSV}`;

      const fileName = `CustomerData_${new Date().toISOString().split("T")[0]}.csv`;
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
      await ReactNativeBlobUtil.fs.writeFile(path, combinedCSV, "utf8");

      await Share.open({
        url: `file://${path}`,
        filename: fileName,
        type: "text/csv",
      });
    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Error", "Failed to export data");
    }
  };

  const handleClear = () => {
    Alert.alert(
      "Clear All Data",
      "Permanently delete all customers and logs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            setCustomers([]);
            setLogs([]);
            Toast.show({ type: "success", text1: "All data cleared" });
          },
        },
      ]
    );
  };

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        ((c as any).phone ?? "").toLowerCase().includes(term)
    );
  }, [customers, search]);

  const ListHeader = (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Customer Database</Text>
      <Text style={[styles.subtitle, { color: colors.subText }]}>
        {customers.length} customers • {logs.length} logs
      </Text>

      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Search name or phone"
        placeholderTextColor={colors.subText}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#16a34a" }]} onPress={handleExport} disabled={loading}>
          <Text style={styles.buttonText}>Export All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={onRefresh}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = (
    <View>
      {customers.length > 0 && (
        <TouchableOpacity style={[styles.button, styles.danger]} onPress={handleClear}>
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
      )}
      <View style={[styles.note, { backgroundColor: colors.chip }]}>
        <Text style={[styles.noteTitle, { color: colors.accent }]}>Info</Text>
        <Text style={[styles.noteText, { color: colors.text }]}>
          • Customers come from transactions{"\n"}• Logs track sent messages{"\n"}• Export both as CSV
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={({ item }: { item: Customer }) => <CustomerCard item={item} colors={colors} />}
          keyExtractor={(item: Customer) => item.id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ paddingBottom: 40 }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.subText }]}>No customers found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginBottom: 20 },
  searchInput: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 15 },
  row: { flexDirection: "row", gap: 10, marginBottom: 20 },
  button: { flex: 1, padding: 15, borderRadius: 10, alignItems: "center" },
  danger: { backgroundColor: "#FF3B30", marginTop: 20 },
  buttonText: { color: "white", fontSize: 14, fontWeight: "600" },
  card: { padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  customerName: { fontSize: 18, fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  phone: { fontSize: 14, marginBottom: 5 },
  date: { fontSize: 12 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 18 },
  note: { padding: 15, borderRadius: 10, marginTop: 20 },
  noteTitle: { fontSize: 16, fontWeight: "600" },
  noteText: { fontSize: 14, lineHeight: 20 },
});