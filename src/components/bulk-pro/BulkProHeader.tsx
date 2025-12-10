import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function BulkProHeader({
    smsStatus,
}: {
    smsStatus: "checking" | "ok" | "fail" | "unknown";
}) {
    const { colors } = useThemeSettings();

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.text }]}>BulkSMS Pro</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>
                Import from Excel or pick contacts. Personalize. Send via device SMS.
            </Text>

            <View style={[styles.info, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>SMS Device Status</Text>
                <Text
                    style={[
                        styles.smsStatusText,
                        smsStatus === "ok" && { color: "#16a34a" },
                        smsStatus === "fail" && { color: "#b91c1c" },
                        smsStatus === "unknown" && { color: colors.subText },
                    ]}
                >
                    {smsStatus === "checking"
                        ? "Checking..."
                        : smsStatus === "ok"
                            ? "Ready to send from this device"
                            : smsStatus === "fail"
                                ? "Cannot send SMS directly, messages will queue"
                                : "Unknown. Try sending to confirm."}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 8 },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 14 },
    info: {
        padding: 10,
        borderRadius: 10,
        gap: 4,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    infoTitle: { fontWeight: "800", fontSize: 14 },
    smsStatusText: { fontSize: 12, fontWeight: "600" },
});
