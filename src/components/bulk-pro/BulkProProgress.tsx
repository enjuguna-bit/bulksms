import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function BulkProProgress({
    sending,
    sent,
    failed,
    queued,
    total,
    paused,
    onPauseResume,
    onStop,
    onSend,
    onRetry,
}: {
    sending: boolean;
    sent: number;
    failed: number;
    queued: number;
    total: number;
    paused: boolean;
    onPauseResume: () => void;
    onStop: () => void;
    onSend: () => void;
    onRetry: () => void;
}) {
    const { colors } = useThemeSettings();

    return (
        <View style={{ gap: 12 }}>
            <View style={[styles.card, { backgroundColor: sending ? "#ecfeff" : colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {sending ? "Sending in Progress..." : "Ready to Send"}
                </Text>
                <Text style={{ color: colors.text }}>Recipients: {total}</Text>
                {sending && (
                    <Text style={{ marginTop: 6, color: colors.text }}>
                        Progress: {sent + failed}/{total} (
                        {Math.round(((sent + failed) / Math.max(1, total)) * 100)}%) · Sent{" "}
                        {sent} • Failed {failed}
                        {queued > 0 && ` • Queued ${queued} (will send in background)`}
                    </Text>
                )}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
                {!sending && (
                    <TouchableOpacity
                        onPress={onSend}
                        disabled={total === 0}
                        style={[styles.btn, { backgroundColor: "#16a34a", opacity: total === 0 ? 0.6 : 1 }]}
                    >
                        <Text style={styles.btnText}>📤 Send</Text>
                    </TouchableOpacity>
                )}
                {sending && (
                    <>
                        <TouchableOpacity
                            onPress={onPauseResume}
                            style={[styles.btn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={styles.btnText}>{paused ? "Resume" : "Pause"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onStop}
                            style={[styles.btn, { backgroundColor: "#ef4444" }]}
                        >
                            <Text style={styles.btnText}>Stop</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {!sending && (
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.accent }]}
                    onPress={onRetry}
                >
                    <Text style={styles.btnText}>🔁 Retry Pending Queue</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    cardTitle: { fontWeight: "800", marginBottom: 6 },
    btn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    btnText: { color: "#fff", fontWeight: "800" },
});
