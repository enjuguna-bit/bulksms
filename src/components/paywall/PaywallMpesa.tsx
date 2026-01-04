import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SUBSCRIPTION_TIERS } from "@/constants/mpesa";

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
            <Text style={styles.sectionSub}>Choose your subscription plan below.</Text>

            {mpesaActive ? (
                <View style={styles.mpesaActiveBox}>
                    <Text style={styles.mpesaActiveTitle}>
                        ✅ Active M-PESA subscription
                    </Text>
                    <Text style={styles.mpesaActiveText}>
                        Expires in {remaining.days}d {remaining.hours}h {remaining.minutes}m
                    </Text>
                    {onLipanaPress && (
                        <TouchableOpacity
                            style={[styles.mpesaButton, { marginTop: 12, backgroundColor: '#059669' }]}
                            onPress={onLipanaPress}
                        >
                            <Text style={styles.mpesaText}>Extend Subscription 💳</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={{ gap: 12 }}>
                    {/* Subscription Tiers Display */}
                    <View style={styles.tiersContainer}>
                        {SUBSCRIPTION_TIERS.map((tier, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.tierCard,
                                    tier.recommended && styles.tierCardRecommended
                                ]}
                            >
                                {tier.recommended && (
                                    <View style={styles.recommendedBadge}>
                                        <Text style={styles.recommendedText}>BEST VALUE</Text>
                                    </View>
                                )}
                                <Text style={styles.tierName}>{tier.name}</Text>
                                <Text style={styles.tierAmount}>Ksh {tier.amount.toLocaleString()}</Text>
                                <Text style={styles.tierDescription}>{tier.description}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Lipana Payment Button */}
                    {onLipanaPress && (
                        <TouchableOpacity
                            style={[
                                styles.mpesaButton,
                                (mpesaLoading || loading) && styles.disabledButton,
                            ]}
                            onPress={onLipanaPress}
                            disabled={mpesaLoading || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.mpesaText}>Pay Now via M-PESA 💳</Text>
                                    <Text style={styles.mpesaSubtext}>
                                        Choose amount on next page
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <Text style={styles.mpesaNote}>
                You'll be redirected to Lipana to complete payment securely.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 18,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: "700",
        color: "#e5e7eb",
        marginBottom: 8,
    },
    sectionSub: {
        fontSize: 14,
        color: "#cbd5f5",
        marginBottom: 16,
    },
    tiersContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    tierCard: {
        flex: 1,
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#334155",
    },
    tierCardRecommended: {
        borderColor: "#22c55e",
        borderWidth: 2,
        backgroundColor: "#0f2922",
    },
    recommendedBadge: {
        backgroundColor: "#22c55e",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginBottom: 6,
    },
    recommendedText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "800",
    },
    tierName: {
        color: "#e5e7eb",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 4,
    },
    tierAmount: {
        color: "#22c55e",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 2,
    },
    tierDescription: {
        color: "#94a3b8",
        fontSize: 10,
        textAlign: "center",
    },
    mpesaButton: {
        backgroundColor: "#16a34a",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        width: "100%",
    },
    mpesaText: {
        color: "#f9fafb",
        fontSize: 17,
        fontWeight: "700",
    },
    mpesaSubtext: {
        color: "#bbf7d0",
        fontSize: 12,
        marginTop: 4,
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
        marginTop: 12,
        fontSize: 12,
        color: "#94a3b8",
        textAlign: "center",
    },
    disabledButton: {
        opacity: 0.6,
    },
});