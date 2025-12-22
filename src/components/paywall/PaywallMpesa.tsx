import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";

interface PaywallMpesaProps {
    mpesaActive: boolean;
    remaining: { days: number; hours: number; minutes: number };
    loading: boolean;
    mpesaLoading: boolean;
    onPress: () => void;
    onLipanaPress?: () => void;
}

export function PaywallMpesa({
    mpesaActive,
    remaining,
    loading,
    mpesaLoading,
    onPress,
    onLipanaPress,
}: PaywallMpesaProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Pay with M-PESA</Text>
            <Text style={styles.sectionSub}>Works even without Store Billing.</Text>

            {mpesaActive ? (
                <View style={styles.mpesaActiveBox}>
                    <Text style={styles.mpesaActiveTitle}>
                        ✅ Active M-PESA subscription
                    </Text>
                    <Text style={styles.mpesaActiveText}>
                        Expires in {remaining.days}d {remaining.hours}h {remaining.minutes}m
                    </Text>
                </View>
            ) : (
                <View style={{ gap: 12 }}>
                    {/* ✅ Lipana Payment Only */}
                    {onLipanaPress && (
                        <TouchableOpacity
                            style={[
                                styles.mpesaButton,
                                { backgroundColor: "#16a34a" },
                                (mpesaLoading || loading) && styles.disabledButton,
                            ]}
                            onPress={onLipanaPress}
                            disabled={mpesaLoading || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.mpesaText}>Pay via Lipana M-PESA 🔗</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <Text style={styles.mpesaNote}>
                Use 2547XXXXXXXX (your registered M-PESA SIM).
            </Text>
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
    mpesaButton: {
        backgroundColor: "#16a34a",
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: "center",
        width: "100%",
    },
    mpesaText: {
        color: "#f9fafb",
        fontSize: 16,
        fontWeight: "700",
    },
    mpesaActiveBox: {
        backgroundColor: "#022c22",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    mpesaActiveTitle: {
        color: "#bbf7d0",
        fontWeight: "700",
        fontSize: 15,
    },
    mpesaActiveText: {
        color: "#bbf7d0",
        fontSize: 13,
        marginTop: 4,
    },
    mpesaNote: {
        marginTop: 8,
        fontSize: 12,
        color: "#cbd5f5",
    },
    disabledButton: {
        opacity: 0.6,
    },
});