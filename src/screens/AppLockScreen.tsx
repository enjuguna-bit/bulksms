import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { Lock, Fingerprint } from "lucide-react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

interface AppLockScreenProps {
    onUnlock: () => void;
}

export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
    const { colors, theme } = useThemeSettings();
    const isDark = theme === "dark";

    useEffect(() => {
        // Auto-prompt on mount
        onUnlock();
    }, [onUnlock]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />

            <View style={[styles.iconCircle, { backgroundColor: isDark ? "#1e293b" : "#e0f2fe" }]}>
                <Lock size={48} color={colors.accent} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>App Locked</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>
                Authentication required to access messages.
            </Text>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={onUnlock}
                activeOpacity={0.8}
            >
                <Fingerprint size={24} color="#fff" style={styles.btnIcon} />
                <Text style={styles.btnText}>Unlock</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 48,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 999,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    btnIcon: {
        marginRight: 12,
    },
    btnText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
});
