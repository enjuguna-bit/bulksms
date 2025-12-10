import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";

interface PaywallHeaderProps {
    isTrialActive: boolean;
    trialDaysLeft: number;
    planInfo: { plan?: string; trialEnd?: number };
    expiryText?: string;
}

export function PaywallHeader({
    isTrialActive,
    trialDaysLeft,
    planInfo,
    expiryText,
}: PaywallHeaderProps) {
    return (
        <View style={styles.headerCard}>
            <View style={styles.headerIconCircle}>
                <ShieldCheck color="#0f766e" size={26} />
            </View>
            <Text style={styles.title}>CEMES BulkSMS Pro</Text>
            <Text style={styles.subtitle}>
                Unlock full SMS automation for arrears follow-up.
            </Text>

            {isTrialActive && (
                <View style={styles.trialBanner}>
                    <Text style={styles.trialText}>
                        ⏳ Trial ends in {trialDaysLeft}{" "}
                        {trialDaysLeft === 1 ? "day" : "days"}
                    </Text>
                </View>
            )}

            {planInfo.plan && expiryText && (
                <View style={styles.activePlanBox}>
                    <Text style={styles.activePlanText}>
                        ✅ Active {planInfo.plan} plan • Expires {expiryText}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerCard: {
        backgroundColor: "#e0f2fe",
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
    },
    headerIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#ccfbf1",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#1e293b",
        marginBottom: 10,
    },
    trialBanner: {
        backgroundColor: "#fef3c7",
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 4,
    },
    trialText: {
        color: "#92400e",
        fontSize: 14,
        fontWeight: "600",
    },
    activePlanBox: {
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#dcfce7",
    },
    activePlanText: {
        color: "#166534",
        fontSize: 14,
        fontWeight: "600",
    },
});
