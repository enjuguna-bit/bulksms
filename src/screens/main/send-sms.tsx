// ------------------------------------------------------
// app/send-sms.tsx — Single SMS Screen (Refactored)
// ------------------------------------------------------
// ✅ Supports manual entry, contacts, recent numbers
// ✅ Handles up to 5 recipients
// ✅ Message templates and live preview
// ✅ Local SMS sending with progress + cancel
// ✅ ProtectedRoute integrated
// ------------------------------------------------------

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Contacts from "react-native-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { requestSmsPermissions } from "@/services/permissions";
import { saveSendLog } from "@/services/storage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { sendSingleSms } from "@/services/smsService";
import { normalizePhone } from "@/utils/dataParsers";

// Icons
import { X, Clock, UserPlus, Send as SendIcon } from "lucide-react-native";

// 📌 Phone Helpers
function isValidPhone(input: string) {
  const clean = input.trim().replace(/\s+/g, "");
  // Basic validation for Kenyan numbers
  return /^(?:\+?254|0)?7\d{8}$/.test(clean);
}

const RECENT_KEY = "recent_numbers";

// 📝 Templates
const TEMPLATES = [
  "Hello, this is a reminder that your payment is due.",
  "Kindly clear your balance today to avoid penalties.",
  "Thank you for your business. Your payment has been received.",
];

// 📦 Storage Helpers
async function saveRecentNumber(phone: string) {
  try {
    const existing = await AsyncStorage.getItem(RECENT_KEY);
    let numbers = existing ? JSON.parse(existing) : [];
    numbers = [phone, ...numbers.filter((n: string) => n !== phone)].slice(0, 5);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(numbers));
  } catch (_) { }
}

async function getRecentNumbers(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch (_) {
    return [];
  }
}

// 📱 Component
export default function SendSMS() {
  return (
    <ProtectedRoute>
      <SendSMSContent />
    </ProtectedRoute>
  );
}

function SendSMSContent() {
  const { colors } = useThemeSettings();

  const [phones, setPhones] = useState<string[]>([]);
  const [rawInput, setRawInput] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const cancelRef = useRef(false);

  const [recent, setRecent] = useState<string[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  // Ask permissions on mount
  useEffect(() => {
    requestSmsPermissions();
    getRecentNumbers().then(setRecent);
  }, []);

  // Live preview on input
  useEffect(() => {
    if (rawInput.trim() && isValidPhone(rawInput)) {
      setPreview(normalizePhone(rawInput));
    } else {
      setPreview("");
    }
  }, [rawInput]);

  const isValid =
    phones.length > 0 &&
    phones.every((p) => isValidPhone(p)) &&
    message.trim().length > 0;

  // Load contacts
  const loadContacts = async () => {
    try {
      const perm = await Contacts.requestPermission();
      if (perm !== "authorized") {
        Alert.alert("Permission Denied", "Allow access to contacts to continue.");
        return;
      }

      const data = await Contacts.getAll();

      const validContacts = data
        .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((c) => {
          const raw = c.phoneNumbers?.[0]?.number || "";
          const num = normalizePhone(raw);
          return { id: c.recordID, name: c.givenName + " " + (c.familyName || ""), number: num };
        })
        .filter((c) => isValidPhone(c.number));

      setContacts(validContacts);
      setSearch("");
      setModalVisible(true);
    } catch (e) {
      Alert.alert("Error", "Unable to load contacts.");
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.number.includes(search)
  );

  // 📤 Send SMS with progress
  const sendMessages = async () => {
    if (!isValid) {
      Alert.alert("Invalid", "Please enter valid phone(s) and message.");
      return;
    }

    try {
      setSending(true);
      cancelRef.current = false;
      setProgress({ sent: 0, total: phones.length });

      let sentCount = 0;

      for (let i = 0; i < phones.length; i++) {
        if (cancelRef.current) break;
        const num = phones[i];

        try {
          const result = await sendSingleSms(num, message.trim());

          await saveSendLog({
            phone: num,
            status: result.success ? "SENT" : "FAILED",
            at: new Date().toISOString(),
            error: result.details || result.error,
          });

          if (result.success) {
            sentCount++;
            await saveRecentNumber(num);
          }
        } catch (_) {
          await saveSendLog({
            phone: num,
            status: "FAILED",
            at: new Date().toISOString(),
            error: "Unknown Exception",
          });
        }

        setProgress({ sent: sentCount, total: phones.length });
        await new Promise((r) => setTimeout(r, 500));
      }

      setRecent(await getRecentNumbers());
      setPhones([]);
      setMessage("");

      Alert.alert(
        "Result",
        `Sent ${sentCount} of ${phones.length} message(s) successfully`
      );
    } catch (_) {
      Alert.alert("Error", "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const cancelSending = () => {
    cancelRef.current = true;
  };

  const clearAllRecipients = () => setPhones([]);

  // 🧱 UI
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[styles.title, { color: colors.text }]}>Send SMS</Text>

        {/* Selected Recipients */}
        {phones.length > 0 && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedBox}>
              {phones.map((num, index) => (
                <View key={num + index} style={[styles.selectedItem, { backgroundColor: colors.chip }]}>
                  <Text style={[styles.selectedText, { color: colors.accent }]}>{num}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPhones((prev) => prev.filter((p) => p !== num))
                    }
                  >
                    <X size={14} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {phones.length > 1 && (
              <TouchableOpacity
                onPress={clearAllRecipients}
                style={[styles.clearAllButton, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.clearAllText, { color: colors.subText }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Manual Entry */}
        {phones.length < 5 && (
          <>
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                placeholder="Phone e.g. 07..., 254..."
                placeholderTextColor={colors.subText}
                value={rawInput}
                onChangeText={setRawInput}
                style={[styles.input, { color: colors.text }]}
                keyboardType="phone-pad"
                editable={!sending}
                onSubmitEditing={() => {
                  if (isValidPhone(rawInput)) {
                    const num = normalizePhone(rawInput);
                    setPhones((prev) =>
                      prev.includes(num) ? prev : [...prev, num].slice(0, 5)
                    );
                    setRawInput("");
                    setPreview("");
                  } else {
                    Alert.alert("Invalid Number", "Enter a valid Kenyan phone number.");
                  }
                }}
              />
              {preview ? (
                <Text style={[styles.previewText, { color: colors.accent }]}>→ {preview}</Text>
              ) : null}
            </View>
          </>
        )}

        {/* Contact Picker */}
        {phones.length < 5 && (
          <TouchableOpacity
            onPress={loadContacts}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            disabled={sending}
          >
            <UserPlus size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.btnText, { color: colors.text }]}>Pick from Contacts</Text>
          </TouchableOpacity>
        )}

        {/* Recent Recipients */}
        {recent.length > 0 && (
          <View style={[styles.recentBox, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Clock size={14} color={colors.subText} style={{ marginRight: 6 }} />
              <Text style={[styles.recentTitle, { color: colors.subText }]}>Recent</Text>
            </View>
            <View style={styles.recentList}>
              {recent.map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() =>
                    setPhones((prev) =>
                      prev.includes(num) ? prev : [...prev, num].slice(0, 5)
                    )
                  }
                  style={[styles.recentItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Text style={[styles.recentText, { color: colors.text }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Templates */}
        <View style={styles.templateBox}>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.templateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setMessage(t)}
            >
              <Text style={[styles.templateText, { color: colors.subText }]} numberOfLines={1}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Message */}
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message here..."
          placeholderTextColor={colors.subText}
          style={[styles.msgInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          multiline
          editable={!sending}
        />
        <Text
          style={[
            styles.charCount,
            { color: colors.subText },
            message.length > 160 && { color: "#ef4444" },
          ]}
        >
          {message.length}/160
        </Text>

        {/* Progress */}
        {sending && (
          <View style={[styles.progressBox, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.progressText, { color: colors.text }]}>
              Sending {progress.sent}/{progress.total}
            </Text>
            <TouchableOpacity onPress={cancelSending} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Send */}
        <TouchableOpacity
          onPress={sendMessages}
          style={[
            styles.sendBtn,
            { backgroundColor: colors.accent },
            !isValid && { opacity: 0.5 },
          ]}
          disabled={!isValid || sending}
        >
          <SendIcon size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.sendBtnText}>
            {sending ? "Sending..." : `Send (${phones.length})`}
          </Text>
        </TouchableOpacity>

        {/* 📜 Contact Picker Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select up to 5 contacts</Text>

              <TextInput
                placeholder="Search contacts..."
                placeholderTextColor={colors.subText}
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />

              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = phones.includes(item.number);
                  const disabled = phones.length >= 5 && !isSelected;
                  return (
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => {
                        setPhones((prev) => {
                          if (isSelected) return prev.filter((n) => n !== item.number);
                          if (prev.length < 5) return [...prev, item.number];
                          return prev;
                        });
                      }}
                      style={[
                        styles.contactItem,
                        { borderBottomColor: colors.border },
                        isSelected && { backgroundColor: colors.accent },
                        disabled && { opacity: 0.5 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.contactText,
                          { color: colors.text },
                          isSelected && { color: "#fff" },
                        ]}
                      >
                        {item.name} — {item.number}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.btn, { marginTop: 10, backgroundColor: colors.background }]}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  previewText: { fontSize: 14, fontWeight: "600", marginLeft: 8 },
  btn: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    flexDirection: 'row',
  },
  btnText: { fontWeight: "600", fontSize: 16 },
  recentBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  recentTitle: { fontWeight: "600", fontSize: 13 },
  recentList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  recentText: { fontSize: 13, fontWeight: "500" },
  charCount: { textAlign: "right", fontSize: 13, marginBottom: 12, marginTop: 4 },
  selectedContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  selectedBox: { flexDirection: "row", flexWrap: "wrap", flex: 1, gap: 8 },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedText: { fontSize: 14, marginRight: 6, fontWeight: "600" },
  clearAllButton: {
    marginLeft: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  clearAllText: { fontSize: 12, fontWeight: "600" },
  templateBox: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  templateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '100%',
  },
  templateText: { fontSize: 13 },
  msgInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    height: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  progressBox: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressText: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ef4444",
    borderRadius: 8,
  },
  cancelText: { color: "#fff", fontWeight: "600" },
  sendBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  contactItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  contactText: { fontSize: 16 },
});
