import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export type PlanCardProps = {
  // OLD REQUIRED PROPS (fully supported)
  label: string;
  price: string;
  selected: boolean;
  bestValue?: boolean;
  onPress: () => void;

  // NEW OPTIONAL PROPS
  period?: string;        // e.g. "Per month" / "Per year"
  description?: string;   // short plan note
};

export const PlanCard = memo(function PlanCard({
  label,
  price,
  selected,
  bestValue,
  onPress,
  period,
  description,
}: PlanCardProps): JSX.Element {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`Select ${label} plan`}
      style={[
        styles.card,
        selected && styles.cardSelected,
        bestValue && styles.cardBestValueBorder,
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.label,
            selected && styles.labelSelected,
          ]}
        >
          {label}
        </Text>

        {bestValue && (
          <Text style={styles.bestValueBadge}>Best value</Text>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text
          style={[
            styles.price,
            selected && styles.priceSelected,
          ]}
        >
          {price}
        </Text>

        <Text style={styles.period}>
          {period ? period : "Subscription"}
        </Text>
      </View>

      {description && (
        <Text style={styles.description}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
});

export default PlanCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#020617",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 10,
  },

  cardSelected: {
    backgroundColor: "#022c22",
    borderColor: "#22c55e",
  },

  cardBestValueBorder: {
    borderColor: "#fbbf24",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e5e7eb",
  },

  labelSelected: {
    color: "#bbf7d0",
  },

  bestValueBadge: {
    backgroundColor: "#facc15",
    color: "#78350f",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "700",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 6,
  },

  price: {
    fontSize: 18,
    fontWeight: "900",
    color: "#f9fafb",
  },

  priceSelected: {
    color: "#bbf7d0",
  },

  period: {
    marginLeft: 8,
    fontSize: 12,
    color: "#9ca3af",
  },

  description: {
    marginTop: 6,
    fontSize: 13,
    color: "#94a3b8",
  },
});
