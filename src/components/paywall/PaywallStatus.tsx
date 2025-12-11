import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, AlertCircle, Clock } from "lucide-react-native";

interface PaywallStatusProps {
  mpesaActive: boolean;
  remaining: { days: number; hours: number; minutes: number };
}

// Memoized status indicator
const StatusIndicator = memo(
  ({
    mpesaActive,
    remaining,
  }: {
    mpesaActive: boolean;
    remaining: { days: number; hours: number; minutes: number };
  }) => {
    const timeString = useMemo(
      () => `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`,
      [remaining.days, remaining.hours, remaining.minutes]
    );

    return (
      <>
        {mpesaActive ? (
          <View style={styles.statusRow}>
            <ShieldCheck color="#0f766e" size={18} />
            <Text style={styles.statusText}>M-PESA subscription is active.</Text>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <AlertCircle color="#b91c1c" size={18} />
            <Text style={styles.statusText}>
              No active M-PESA subscription detected.
            </Text>
          </View>
        )}

        {mpesaActive && (
          <View style={styles.remainingRow}>
            <Clock color="#0f172a" size={16} />
            <Text style={styles.remainingText}>Expires in {timeString}</Text>
          </View>
        )}
      </>
    );
  },
  (prev, next) =>
    prev.mpesaActive === next.mpesaActive &&
    prev.remaining.days === next.remaining.days &&
    prev.remaining.hours === next.remaining.hours &&
    prev.remaining.minutes === next.remaining.minutes
);

export function PaywallStatus({
  mpesaActive,
  remaining,
}: PaywallStatusProps) {
  return (
    <View style={styles.statusCard}>
      <StatusIndicator mpesaActive={mpesaActive} remaining={remaining} />

      <Text style={styles.statusHint}>
        After payment, we read your M-PESA SMS and auto-activate.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    marginTop: 8,
    backgroundColor: "#ecfeff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusText: {
    marginLeft: 8,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  remainingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  remainingText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#0f172a",
  },
  statusHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#0f172a",
  },
});
