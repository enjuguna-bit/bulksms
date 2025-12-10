import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
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

export function PaywallPlans({
    selectedPlan,
    setSelectedPlan,
    loading,
    mpesaLoading,
    onPurchase,
    onRestore,
}: PaywallPlansProps) {
    const monthlyPrice = "KES 3,900";
    const quarterlyPrice = "KES 10,900";
    const yearlyPrice = "KES 39,000";

    return (
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Pay with Store</Text>
            <Text style={styles.sectionSub}>
                Use your Play Store or App Store account.
            </Text>

            <View style={styles.plansRow}>
                <PlanCard
                    label="1 Month"
                    price={monthlyPrice}
                    period="Per month"
                    description="Good for active use"
                    selected={selectedPlan === "monthly"}
                    bestValue={false}
                    onPress={() => setSelectedPlan("monthly")}
                />
                <PlanCard
                    label="3 Months"
                    price={quarterlyPrice}
                    period="Every 3 months"
                    description="Balanced cost"
                    selected={selectedPlan === "quarterly"}
                    bestValue={false}
                    onPress={() => setSelectedPlan("quarterly")}
                />
                <PlanCard
                    label="12 Months"
                    price={yearlyPrice}
                    period="Per year"
                    description="Best value"
                    selected={selectedPlan === "yearly"}
                    bestValue
                    onPress={() => setSelectedPlan("yearly")}
                />
            </View>

            <TouchableOpacity
                style={[
                    styles.upgradeButton,
                    (loading || mpesaLoading) && styles.disabledButton,
                ]}
                onPress={onPurchase}
                disabled={loading || mpesaLoading}
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
                style={[
                    styles.restoreButton,
                    (loading || mpesaLoading) && styles.disabledButton,
                ]}
                onPress={onRestore}
                disabled={loading || mpesaLoading}
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
