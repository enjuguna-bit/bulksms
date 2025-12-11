import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

// ✅ FIXED SOURCE
import { MPESA_PLANS } from "@/constants/mpesa";

type Plan = {
  days: number;
  amount: number;
  bestValue?: boolean;
};

type Props = {
  visible: boolean;
  phone: string;
  onPhoneChange: (p: string) => void;
  onClose: () => void;
  onSelectPlan: (amount: number) => void;
};

export const MpesaPaymentModal = memo(function MpesaPaymentModal({
  visible,
  phone,
  onPhoneChange,
  onClose,
  onSelectPlan,
}: Props): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // 🪄 Auto-focus when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleChangePhone = useCallback(
    (text: string) => {
      setError(null);
      onPhoneChange(text);
    },
    [onPhoneChange]
  );

  const handleSelectPlan = useCallback(
    (amount: number) => {
      if (!/^2547\d{8}$/.test(phone)) {
        setError("Enter a valid phone number (2547XXXXXXXX)");
        inputRef.current?.focus();
        return;
      }
      onSelectPlan(amount);
    },
    [onSelectPlan, phone]
  );

  const handleCopyTill = useCallback(async () => {
    Alert.alert("📱 Till Number", "Buy Goods Till Number: 3484366\n(Please copy manually)");
  }, []);

  const renderPlan = useCallback(
    ({ item }: { item: Plan }) => (
      <TouchableOpacity
        style={[styles.planBtn, item.bestValue && styles.bestValueBtn]}
        onPress={() => handleSelectPlan(item.amount)}
        activeOpacity={0.85}
        accessibilityLabel={`Pay KES ${item.amount} for ${item.days} days`}
      >
        {item.bestValue && (
          <Text style={styles.bestValueBadge}>⭐ Best Value</Text>
        )}
        <Text style={styles.planText}>
          {item.days} {item.days === 1 ? "Day" : "Days"} — KES {item.amount}
        </Text>
      </TouchableOpacity>
    ),
    [handleSelectPlan]
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <Text style={styles.title}>Enter M-PESA Number</Text>

          <TextInput
            ref={inputRef}
            style={[styles.input, error && styles.inputError]}
            placeholder="2547XXXXXXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={handleChangePhone}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={12}
            accessibilityLabel="Phone number input"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Copy till number */}
          <TouchableOpacity onPress={handleCopyTill} activeOpacity={0.7}>
            <Text style={styles.paymentNote}>
              💳 Or pay manually to Buy Goods Till Number:{" "}
              <Text style={styles.tillNumber}>3484366</Text> (tap to copy)
            </Text>
          </TouchableOpacity>

          {/* Plans list */}
          <FlatList
            data={MPESA_PLANS}
            keyExtractor={(item) => String(item.days)}
            renderItem={renderPlan}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={styles.buttons}
          />

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

export default MpesaPaymentModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1e293b",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginBottom: 8,
  },
  paymentNote: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
    textAlign: "center",
  },
  tillNumber: {
    fontWeight: "700",
    color: "#2563eb",
  },
  buttons: { paddingTop: 8 },
  planBtn: {
    backgroundColor: "#34A853",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    position: "relative",
  },
  planText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bestValueBtn: {
    backgroundColor: "#15803d",
  },
  bestValueBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#facc15",
    color: "#000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 6,
  },
  cancelBtn: { marginTop: 16, alignItems: "center" },
  cancelText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
});
