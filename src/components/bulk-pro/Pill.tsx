import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function Pill({
    active,
    label,
    onPress,
}: {
    active: boolean;
    label: string;
    onPress: () => void;
}) {
    const { colors } = useThemeSettings();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.pill,
                {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                },
            ]}
        >
            <Text
                style={[
                    styles.pillText,
                    { color: active ? "#fff" : colors.text },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
    },
    pillText: { fontWeight: "700" },
});
