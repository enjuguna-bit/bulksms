import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { Send, FileText, BarChart2, ChevronRight } from "lucide-react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function ToolsScreen() {
    const router = useSafeRouter();
    const { colors } = useThemeSettings();

    const tools = [
        {
            id: "bulk",
            title: "Bulk SMS Pro",
            desc: "Send mass messages to your customers",
            icon: Send,
            route: "BulkPro",
            color: "#2563eb",
        },
        {
            id: "single",
            title: "Single SMS",
            desc: "Send a quick message to one person",
            icon: FileText,
            route: "SendSms",
            color: "#059669",
        },
        {
            id: "transactions",
            title: "Transactions",
            desc: "View payment history and reports",
            icon: BarChart2,
            route: "Transactions",
            color: "#d97706",
        },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Tools</Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                    Manage your messaging and payments
                </Text>
            </View>

            <View style={styles.grid}>
                {tools.map((tool) => (
                    <TouchableOpacity
                        key={tool.id}
                        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.safePush(tool.route as any)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: tool.color + "20" }]}>
                            <tool.icon size={24} color={tool.color} />
                        </View>
                        <View style={styles.content}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{tool.title}</Text>
                            <Text style={[styles.cardDesc, { color: colors.subText }]}>{tool.desc}</Text>
                        </View>
                        <ChevronRight size={20} color={colors.subText} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingBottom: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    grid: {
        padding: 16,
        gap: 12,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
    },
});
