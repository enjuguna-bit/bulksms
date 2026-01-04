import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Clipboard } from "react-native";
import { useBilling } from "@/providers/BillingProvider";
import { Lock, Clock, ShieldAlert, GraduationCap } from "lucide-react-native";

interface Props {
    style?: any;
}

export const BillingDiagnosticsBanner = memo(function BillingDiagnosticsBanner({ style }: Props) {
    const {
        isBypassActive,
        bypassSource,
        status,
        trialDaysLeft,
        trialEndsAt,
        subDaysLeft,
        isInGracePeriod,
        graceDaysRemaining,
    } = useBilling();

    const activeState = useMemo(() => {
        if (isBypassActive) return "bypass";
        if (isInGracePeriod) return "grace";
        if (status === "trial") return "trial";
        // Also check explicit trial flags if status string differs
        if (trialDaysLeft !== null && trialDaysLeft >= 0 && status !== "active") return "trial";
        return null;
    }, [isBypassActive, isInGracePeriod, status, trialDaysLeft]);

    if (!activeState) return null;

    const handleLongPress = () => {
        const debugInfo = JSON.stringify(
            { isBypassActive, bypassSource, status, trialDaysLeft, isInGracePeriod },
            null,
            2
        );
        Clipboard.setString(debugInfo);
        Alert.alert("Debug Info Copied", "Billing diagnostics copied to clipboard.");
    };

    if (activeState === "bypass") {
        return (
            <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.9}>
                <View style={[styles.container, styles.bypassBg, style]}>
                    <View style={styles.iconContainer}>
                        <Lock size={16} color="#1e40af" />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.title, styles.bypassText]}>
                            Admin/Dev Unlock Active
                        </Text>
                        <Text style={[styles.subtitle, styles.bypassText]}>
                            Source: {bypassSource || "Unknown"}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    if (activeState === "grace") {
        return (
            <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.9}>
                <View style={[styles.container, styles.graceBg, style]}>
                    <View style={styles.iconContainer}>
                        <ShieldAlert size={16} color="#92400e" />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.title, styles.graceText]}>
                            Grace Period Active
                        </Text>
                        <Text style={[styles.subtitle, styles.graceText]}>
                            Ends in {graceDaysRemaining} days. Please renew soon.
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    if (activeState === "trial") {
        return (
            <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.9}>
                <View style={[styles.container, styles.trialBg, style]}>
                    <View style={styles.iconContainer}>
                        <GraduationCap size={16} color="#475569" />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.title, styles.trialText]}>
                            Free Trial Active
                        </Text>
                        <Text style={[styles.subtitle, styles.trialText]}>
                            {trialDaysLeft !== null ? `${trialDaysLeft} days remaining` : "Expires soon"}
                            {trialEndsAt ? ` (${new Date(trialEndsAt).toLocaleDateString()})` : ""}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return null;
});

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
    },
    iconContainer: {
        marginRight: 10,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        opacity: 0.9,
    },
    // Bypass - Blue
    bypassBg: {
        backgroundColor: "#eff6ff",
        borderColor: "#bfdbfe",
    },
    bypassText: {
        color: "#1e40af",
    },
    // Grace - Amber
    graceBg: {
        backgroundColor: "#fffbeb",
        borderColor: "#fde68a",
    },
    graceText: {
        color: "#92400e",
    },
    // Trial - Slate/Gray
    trialBg: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
    },
    trialText: {
        color: "#475569",
    },
});
