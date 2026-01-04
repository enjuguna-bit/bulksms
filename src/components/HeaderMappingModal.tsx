// ------------------------------------------------------
// components/HeaderMappingModal.tsx
// ------------------------------------------------------
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useThemeSettings } from "@/theme/ThemeProvider";

type Props = {
  visible: boolean;
  headers: string[];
  amountCandidates?: string[];
  sampleRows: Record<string, unknown>[];
  mapping: { name: string; phone: string; amount: string };
  onConfirm: (map: { name: string; phone: string; amount: string }) => void;
  onCancel: () => void;
};

export default function HeaderMappingModal({
  visible,
  headers = [],
  amountCandidates = [],
  sampleRows = [],
  mapping,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useThemeSettings();
  const [localMap, setLocalMap] = useState(mapping);

  useEffect(() => {
    setLocalMap({
      name: mapping.name || headers[0] || "",
      phone: mapping.phone || headers[0] || "",
      amount: mapping.amount || amountCandidates[0] || headers[0] || "",
    });
  }, [mapping, headers, amountCandidates]);

  // Always show all headers for amount selection, but prioritize amountCandidates at the top
  const amountOptions = amountCandidates.length 
    ? [...new Set([...amountCandidates, ...headers])] // Candidates first, then remaining headers
    : headers;

  const safeName = localMap?.name ?? "";
  const safePhone = localMap?.phone ?? "";
  const safeAmount = localMap?.amount ?? "";

  const handleConfirm = () => {
    if (!safeName || !safePhone || !safeAmount) {
      Alert.alert("Mapping Required", "Please select all fields before continuing.");
      return;
    }
    onConfirm(localMap);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <ScrollView>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🧭 Confirm Header Mapping</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
              Select which column corresponds to each field.
            </Text>

            {/* Name */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Name Column</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <Picker
                selectedValue={safeName}
                onValueChange={(v) => setLocalMap({ ...localMap, name: v })}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {headers.map((h) => (
                  <Picker.Item key={h} label={h} value={h} color={colors.text} />
                ))}
              </Picker>
            </View>

            {/* Phone */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Phone Column</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <Picker
                selectedValue={safePhone}
                onValueChange={(v) => setLocalMap({ ...localMap, phone: v })}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {headers.map((h) => (
                  <Picker.Item key={h} label={h} value={h} color={colors.text} />
                ))}
              </Picker>
            </View>

            {/* Amount */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Amount Column</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <Picker
                selectedValue={safeAmount}
                onValueChange={(v) => setLocalMap({ ...localMap, amount: v })}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {amountOptions.map((h) => (
                  <Picker.Item key={h} label={h} value={h} color={colors.text} />
                ))}
              </Picker>
            </View>

            {/* Amount Preview */}
            {safeAmount ? (
              <Text style={[styles.amountPreview, { color: colors.subText }]}>
                Example: {String(sampleRows[0]?.[safeAmount] ?? "No value")}
              </Text>
            ) : null}

            {/* Preview Rows */}
            <Text style={{ fontWeight: "700", marginTop: 12, color: colors.text }}>
              Preview (first 5 rows)
            </Text>
            <View style={{ marginTop: 6 }}>
              {sampleRows.slice(0, 5).map((r, i) => (
                <Text key={i} style={[styles.previewLine, { color: colors.text }]}>
                  {String(r?.[safeName] ?? "-")} | {String(r?.[safePhone] ?? "-")} |{" "}
                  {String(r?.[safeAmount] ?? "-")}
                </Text>
              ))}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", marginTop: 16 }}>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onCancel}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { marginLeft: 8, backgroundColor: colors.accent }]}
                onPress={handleConfirm}
              >
                <Text style={styles.btnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  modalCard: { padding: 16, borderRadius: 12, maxHeight: "85%" },
  modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 10 },
  fieldLabel: { fontWeight: "600", marginTop: 8, marginBottom: 4 },
  pickerContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  previewLine: { fontSize: 13, paddingVertical: 2 },
  amountPreview: { fontSize: 12, marginTop: 4 },
  btn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  btnDanger: { backgroundColor: "#ef4444" },
  btnText: { color: "#fff", fontWeight: "700" },
});
