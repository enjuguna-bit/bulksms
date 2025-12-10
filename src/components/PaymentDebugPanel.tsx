// -----------------------------------------------------
// src/components/PaymentDebugPanel.tsx
// Debug panel for monitoring auto-activation system
// -----------------------------------------------------

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { getActivationLogs, getPendingPayments } from "@/services/enhancedPaymentService";

interface PaymentDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function PaymentDebugPanel({ visible, onClose }: PaymentDebugPanelProps): JSX.Element {
  const [logs, setLogs] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activationLogs, pendingPayments] = await Promise.all([
        getActivationLogs(),
        getPendingPayments(),
      ]);
      setLogs(activationLogs.slice(-10).reverse()); // Show last 10, newest first
      setPending(pendingPayments);
    } catch (error) {
      console.error("[PaymentDebugPanel] Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  if (!visible) return <></>;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh Data</Text>
        </TouchableOpacity>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Payments ({pending.length})</Text>
            {pending.length === 0 ? (
              <Text style={styles.emptyText}>No pending payments</Text>
            ) : (
              pending.map((payment, index) => (
                <View key={payment.id || index} style={styles.item}>
                  <Text style={styles.itemText}>
                    {payment.type?.toUpperCase()} - KES {payment.amount}
                  </Text>
                  <Text style={styles.itemSubText}>
                    Status: {payment.status} • Created: {new Date(payment.createdAt).toLocaleTimeString()}
                  </Text>
                  {payment.transactionId && (
                    <Text style={styles.itemSubText}>
                      TXN: {payment.transactionId}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activation Logs ({logs.length})</Text>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No activation logs</Text>
            ) : (
              logs.map((log, index) => (
                <View key={log.id || index} style={styles.item}>
                  <Text style={[styles.itemText, log.status === 'success' ? styles.success : styles.error]}>
                    {log.type?.toUpperCase()} - KES {log.amount} - {log.status?.toUpperCase()}
                  </Text>
                  <Text style={styles.itemSubText}>
                    {new Date(log.timestamp).toLocaleString()}
                  </Text>
                  <Text style={styles.itemSubText}>
                    {log.reason}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  panel: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: "#94a3b8",
    fontSize: 18,
  },
  refreshButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  refreshText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748b",
    fontStyle: "italic",
  },
  item: {
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  itemText: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "600",
  },
  itemSubText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  success: {
    color: "#22c55e",
  },
  error: {
    color: "#ef4444",
  },
});
