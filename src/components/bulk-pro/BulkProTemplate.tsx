import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

export default function BulkProTemplate({
    template,
    setTemplate,
    recents,
    onSave,
    onClearRecents,
    disabled,
    availableFields = [],
}: {
    template: string;
    setTemplate: (t: string) => void;
    recents: string[];
    onSave: () => void;
    onClearRecents: () => void;
    disabled?: boolean;
    /** Available field names from Excel headers for dynamic placeholders */
    availableFields?: string[];
}) {
    const { colors } = useThemeSettings();
    const templateLen = template.length;
    const templateSegments = Math.max(1, Math.ceil(templateLen / 160));

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Message Template</Text>
                <TouchableOpacity onPress={onSave} disabled={disabled}>
                    <Text style={[styles.toolbarBtn, { color: colors.accent }]}>Save to Recents</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                multiline
                value={template}
                onChangeText={setTemplate}
                placeholder="Hello {name}, your balance is KES {amount}."
                placeholderTextColor={colors.subText}
                style={[
                    styles.input,
                    {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                    },
                ]}
                editable={!disabled}
            />
            <Text style={{ fontSize: 12, color: colors.subText, marginTop: 6 }}>
                Characters: {templateLen} · Segments: {templateSegments}
            </Text>

            {/* Available Placeholders */}
            <View style={styles.placeholdersBox}>
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                    📝 Available Placeholders (tap to insert)
                </Text>
                <View style={styles.placeholderRow}>
                    {/* Built-in placeholders */}
                    {['name', 'phone', 'amount'].map((field) => (
                        <TouchableOpacity
                            key={field}
                            style={[styles.placeholderChip, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                            onPress={() => setTemplate(template + `{${field}}`)}
                            disabled={disabled}
                        >
                            <Text style={[styles.placeholderText, { color: colors.accent }]}>
                                {`{${field}}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {/* Dynamic placeholders from Excel */}
                    {availableFields
                        .filter(f => !['name', 'phone', 'amount'].includes(f.toLowerCase()))
                        .slice(0, 10) // Limit to prevent overflow
                        .map((field) => (
                            <TouchableOpacity
                                key={field}
                                style={[styles.placeholderChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setTemplate(template + `{${field}}`)}
                                disabled={disabled}
                            >
                                <Text style={[styles.placeholderText, { color: colors.text }]}>
                                    {`{${field}}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                </View>
                {availableFields.length === 0 && (
                    <Text style={{ fontSize: 11, color: colors.subText, marginTop: 4 }}>
                        Import Excel to see custom field placeholders
                    </Text>
                )}
            </View>

            {recents.length > 0 && (
                <View style={[styles.recentsBox, { backgroundColor: colors.background }]}>
                    <View style={styles.recentsHeader}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Recent Templates</Text>
                        <TouchableOpacity onPress={onClearRecents}>
                            <Text style={[styles.toolbarBtn, { fontSize: 11, color: colors.accent }]}>
                                Clear
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {recents.map((msg, idx) => (
                        <TouchableOpacity
                            key={`${idx}-${msg.slice(0, 20)}`}
                            style={[styles.recentItem, { borderTopColor: colors.border }]}
                            onPress={() => setTemplate(msg)}
                            disabled={disabled}
                        >
                            <Text numberOfLines={2} style={{ fontSize: 12, color: colors.subText }}>
                                {msg}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 12,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
    },
    header: { flexDirection: "row", justifyContent: "space-between" },
    cardTitle: { fontWeight: "800", marginBottom: 6 },
    toolbarBtn: { fontWeight: "700", fontSize: 12 },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        minHeight: 96,
        textAlignVertical: "top",
    },
    placeholdersBox: {
        marginTop: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    placeholderTitle: {
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 8,
    },
    placeholderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    placeholderChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    placeholderText: {
        fontSize: 12,
        fontWeight: '600',
    },
    recentsBox: {
        marginTop: 10,
        padding: 10,
        borderRadius: 10,
    },
    recentsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    infoTitle: { fontWeight: "800", fontSize: 12 },
    recentItem: {
        paddingVertical: 6,
        borderTopWidth: 1,
    },
});
