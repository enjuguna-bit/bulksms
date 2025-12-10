import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    FlatList,
} from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";
import type { Recipient } from "./EditModal";

export default function RecipientsModal({
    visible,
    recipients,
    onClose,
    onEdit,
}: {
    visible: boolean;
    recipients: Recipient[];
    onClose: () => void;
    onEdit: (r: Recipient) => void;
}) {
    const { colors } = useThemeSettings();
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return recipients;
        return recipients.filter(
            (r) =>
                (r.name ?? "").toLowerCase().includes(s) ||
                (r.phone ?? "").toLowerCase().includes(s)
        );
    }, [recipients, search]);

    return (
        <Modal visible={visible} animationType="slide">
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        📋 All Recipients ({recipients.length})
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[styles.closeBtn, { color: colors.accent }]}>Close</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search name or phone..."
                    placeholderTextColor={colors.subText}
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.card,
                            color: colors.text,
                            borderColor: colors.border,
                        },
                    ]}
                />

                <View style={{ flex: 1, marginTop: 10 }}>
                    <FlatList
                        data={filtered}
                        keyExtractor={(_, i) => String(i)}
                        renderItem={({ item }: { item: Recipient }) => (
                            <TouchableOpacity
                                onPress={() => onEdit(item)}
                                style={[styles.item, { borderBottomColor: colors.border }]}
                            >
                                <Text style={[styles.itemTitle, { color: colors.text }]}>
                                    {item.name || "Unnamed"} · {item.phone}
                                    {item.edited && <Text style={{ color: colors.accent }}> ✏️</Text>}
                                </Text>
                                <Text style={[styles.itemBody, { color: colors.subText }]}>
                                    KES {item.amount ?? 0}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    title: { fontWeight: "800", fontSize: 18 },
    closeBtn: { fontWeight: "700" },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    item: {
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    itemTitle: { fontWeight: "700" },
    itemBody: { fontSize: 12, marginTop: 2 },
});
