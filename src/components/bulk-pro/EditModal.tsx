import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

import { Recipient } from "@/types/bulkSms";

type FieldProps = React.ComponentProps<typeof TextInput> & {
    label?: string;
    hint?: string;
};

const Field = React.memo((props: FieldProps) => {
    const { label, hint, style, ...rest } = props;
    const { colors } = useThemeSettings();
    return (
        <View style={{ marginVertical: 4 }}>
            {label && (
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
            )}
            <TextInput
                placeholder={hint}
                placeholderTextColor={colors.subText}
                style={[
                    styles.input,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        color: colors.text,
                    },
                    style,
                ]}
                {...rest}
            />
        </View>
    );
});

export default function EditModal({
    visible,
    recipient,
    onSave,
    onCancel,
}: {
    visible: boolean;
    recipient: Recipient | null;
    onSave: (r: Recipient) => void;
    onCancel: () => void;
}) {
    const { colors } = useThemeSettings();
    const [local, setLocal] = useState<Recipient>({
        name: "",
        phone: "",
        amount: null,
    });

    useEffect(() => {
        if (recipient) setLocal(recipient);
    }, [recipient]);

    if (!recipient) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        ✏️ Edit Recipient
                    </Text>
                    <Field
                        value={local.name}
                        onChangeText={(t) => setLocal({ ...local, name: t })}
                        label="Name"
                    />
                    <Field
                        value={local.phone}
                        onChangeText={(t) => setLocal({ ...local, phone: t })}
                        label="Phone"
                    />
                    <Field
                        value={String(local.amount ?? "")}
                        onChangeText={(t) =>
                            setLocal({
                                ...local,
                                amount: t.trim() === "" ? null : Number(t.replace(/[^\d.]/g, "")),
                            })
                        }
                        label="Amount"
                        keyboardType="numeric"
                    />
                    <View style={{ flexDirection: "row", marginTop: 16 }}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnDanger]}
                            onPress={onCancel}
                        >
                            <Text style={styles.btnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, { marginLeft: 8, backgroundColor: colors.accent }]}
                            onPress={() => onSave({ ...local, edited: true })}
                        >
                            <Text style={styles.btnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        padding: 16,
    },
    modalCard: { padding: 16, borderRadius: 12 },
    modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 10 },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    fieldLabel: { marginBottom: 6, fontWeight: "700" },
    btn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    btnDanger: { backgroundColor: "#ef4444" },
    btnText: { color: "#fff", fontWeight: "800" },
});
