import React, { memo, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { PlanCard } from "../PlanCard";

type Plan = "monthly" | "quarterly" | "yearly";

interface PaywallPlansProps {
  selectedPlan: Plan;
  setSelectedPlan: (plan: Plan) => void;
  loading: boolean;
  mpesaLoading: boolean;
  onPurchase: () => void;
  onRestore: () => void;
}

// Memoized plan card wrapper
const MemoizedPlanCard = memo(PlanCard, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.price === next.price &&
    prev.bestValue === next.bestValue
  );
});

const PlanOption = memo(
  ({
    label,
    price,
    period,
    description,
    selected,
    bestValue,
    onPress,
  }: {
    label: string;
    price: string;
    period: string;
    description: string;
    selected: boolean;
    bestValue: boolean;
    onPress: () => void;
  }) => (
    <MemoizedPlanCard
      label={label}
      price={price}
      period={period}
      description={description}
      selected={selected}
      bestValue={bestValue}
      onPress={onPress}
    />
  ),
  (prev, next) =>
    prev.label === next.label &&
    prev.selected === next.selected &&
    prev.price === next.price
);

export function PaywallPlans({
  selectedPlan,
  setSelectedPlan,
  loading,
  mpesaLoading,
  onPurchase,
  onRestore,
}: PaywallPlansProps) {
  // Memoize plan data
  const plans = useMemo(
    () => [
      {
        id: "monthly",
        label: "1 Month",
        price: "KES 3,900",
        period: "Per month",
        description: "Good for active use",
        bestValue: false,
      },
      {
        id: "quarterly",
        label: "3 Months",
        price: "KES 10,900",
        period: "Every 3 months",
        description: "Balanced cost",
        bestValue: false,
      },
      {
        id: "yearly",
        label: "12 Months",
        price: "KES 39,000",
        period: "Per year",
        description: "Best value",
        bestValue: true,
      },
    ],
    []
  );

  // Memoize button state
  const isButtonDisabled = useMemo(
    () => loading || mpesaLoading,
    [loading, mpesaLoading]
  );

  // Memoize callbacks
  const handlePlanSelect = useCallback(
    (plan: Plan) => {
      setSelectedPlan(plan);
    },
    [setSelectedPlan]
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Pay with Store</Text>
      <Text style={styles.sectionSub}>
        Use your Play Store or App Store account.
      </Text>

      <View style={styles.plansRow}>
        {plans.map((plan) => (
          <PlanOption
            key={plan.id}
            label={plan.label}
            price={plan.price}
            period={plan.period}
            description={plan.description}
            selected={selectedPlan === plan.id}
            bestValue={plan.bestValue}
            onPress={() => handlePlanSelect(plan.id as Plan)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.upgradeButton, isButtonDisabled && styles.disabledButton]}
        onPress={onPurchase}
        disabled={isButtonDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.upgradeText}>
            {selectedPlan === "yearly" ? "Upgrade (Best ⭐)" : "Upgrade"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.restoreButton, isButtonDisabled && styles.disabledButton]}
        onPress={onRestore}
        disabled={isButtonDisabled}
        activeOpacity={0.8}
      >
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 13,
    color: "#cbd5f5",
    marginBottom: 10,
  },
  plansRow: {
    flexDirection: "column",
    gap: 10,
  },
  upgradeButton: {
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 12,
  },
  upgradeText: {
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "700",
  },
  restoreButton: {
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#94a3b8",
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  restoreText: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
