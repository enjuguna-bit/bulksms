import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAppLock } from "../hooks/useAppLock";
import { useThemeSettings } from "../theme/ThemeProvider";

export default function AppLockGate({ children }: { children: React.ReactNode }) {
    const { isLocked, unlock, isSupported, isEnabled, isReady } = useAppLock();
    const { colors } = useThemeSettings();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        if (isReady && isEnabled && isLocked && !isAuthenticating) {
            handleUnlock();
        }
    }, [isReady, isEnabled, isLocked]);

    const handleUnlock = async () => {
        setIsAuthenticating(true);
        await unlock();
        setIsAuthenticating(false);
    };

    if (!isReady) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    if (isEnabled && isLocked) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, { color: colors.text }]}>App Locked</Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                    Please authenticate to continue
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.accent }]}
                    onPress={handleUnlock}
                >
                    <Text style={styles.buttonText}>Unlock</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 30,
        textAlign: "center",
    },
    button: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
