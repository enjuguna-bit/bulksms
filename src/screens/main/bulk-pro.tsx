// ------------------------------------------------------
// app/bulk-pro.tsx — BulkSMS Pro (FlatList + Performance)
// ------------------------------------------------------
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ProtectedRoute from "@/components/ProtectedRoute";
import HeaderMappingModal from "@/components/HeaderMappingModal";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { useBulkPro } from "@/hooks/useBulkPro";
import { useSafeRouter } from "@/hooks/useSafeRouter";

import BulkProHeader from "@/components/bulk-pro/BulkProHeader";
import Pill from "@/components/bulk-pro/Pill";
import BulkProTemplate from "@/components/bulk-pro/BulkProTemplate";
import BulkProProgress from "@/components/bulk-pro/BulkProProgress";
import RecipientsModal from "@/components/bulk-pro/RecipientsModal";
import { Recipient } from "@/types/bulkSms";
import EditModal from "@/components/bulk-pro/EditModal";
import SessionManager from "@/components/bulk-pro/SessionManager";
import { getLargeDatasetListProps, getFixedHeightListProps } from "@/utils/performance/listOptimizations";

export default function BulkSMSPro(): JSX.Element {
  return (
    <ProtectedRoute>
      <BulkSMSProContent />
    </ProtectedRoute>
  );
}

function BulkSMSProContent(): JSX.Element {
  const { colors } = useThemeSettings();
  const router = useSafeRouter();
  const navigation = useNavigation<any>(); // Direct navigation for Alert callbacks
  const {
    mode, setMode,
    template, setTemplate,
    recents, saveTemplate, clearRecents,
    excelRows, setExcelRows, clearExcelRows,
    importLoading, handlePickCsv,
    headers, sampleRows, allRawRows, amountCandidates, showMappingModal, setShowMappingModal,
    contacts, contactsLoading, selectedIds, setSelectedIds, query, setQuery,
    mergedRecipients,
    sending, sent, failed, queued, delivered, paused, sendSpeed, setSendSpeed,
    handleSend, togglePause, stopSending,
    smsStatus,
    runQueueNow,
    formatMessage,
    normalizePhone,
    // Session state
    activeSession,
    showResumePrompt,
    handleSessionResume,
    handleSessionDiscard,
    sessionLoading,
    queueStatus,
    clearExhausted,
  } = useBulkPro();

  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);

  // Memoize the header mapping to prevent unnecessary re-renders
  const headerMapping = useMemo(() => ({
    name: headers.find(h => h.toLowerCase().replace(/\s+/g, "") === "fullnames") ?? "FullNames",
    phone: headers.find(h => h.toLowerCase().replace(/\s+/g, "") === "phonenumber") ?? "PhoneNumber",
    amount: amountCandidates[0] ?? "Arrears Amount",
  }), [headers, amountCandidates]);

  // 💳 Wrapper to handle subscription enforcement
  const handleSendWithBillingCheck = async () => {
    const result = await handleSend();
    if (result?.blocked && result.reason === "subscription_expired") {
      Alert.alert(
        "Subscription Required",
        "Your free trial has ended. Subscribe to continue sending bulk SMS.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View Plans",
            onPress: () => {
              // Navigate to Subscription screen (Settings → Subscription)
              try {
                console.log("[BulkPro] Redirecting to Subscription screen");
                router.safePush("Subscription");
              } catch (e) {
                console.error("[BulkPro] Navigation to Subscription failed:", e);
                // Fallback: Try direct navigation
                try {
                  navigation.navigate("Subscription" as never);
                } catch (e2) {
                  console.error("[BulkPro] Fallback navigation failed:", e2);
                  Alert.alert("Error", "Unable to open subscription page. Please go to Settings → Subscription.");
                }
              }
            }
          }
        ]
      );
    }
  };

  const total = mergedRecipients.length;

  const filteredContacts = React.useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.name?.toLowerCase() ?? "").includes(q) ||
        (c.phoneNumbers?.[0] ?? "").includes(q)
    );
  }, [contacts, query]);

  function editRecipient(recipient: Recipient) {
    setEditingRecipient(recipient);
    setEditVisible(true);
  }

  function saveRecipient(updated: Recipient) {
    setExcelRows((prev) =>
      prev.map((r) => (r.phone === editingRecipient?.phone ? updated : r))
    );
    setEditVisible(false);
  }

  function clearAllRecipients() {
    clearExcelRows();
    setSelectedIds(new Set());
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <BulkProHeader smsStatus={smsStatus} />

          {/* Campaigns Entry */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            onPress={() => navigation.navigate('CampaignList')}
          >
            <View>
              <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 2 }]}>Marketing Campaigns</Text>
              <Text style={{ color: colors.subText }}>Track delivery & A/B tests</Text>
            </View>
            <Text style={{ fontSize: 24 }}>📊</Text>
          </TouchableOpacity>

          {/* Session Banner */}
          {(queueStatus.pending > 0 || queueStatus.exhausted > 0) && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Background Queue</Text>
                {queueStatus.exhausted > 0 && (
                  <TouchableOpacity onPress={() => {
                    Alert.alert("Clear Exhausted?", "Remove all messages that exceeded max retries?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Clear", style: "destructive", onPress: clearExhausted }
                    ]);
                  }}>
                    <Text style={{ color: colors.accent, fontWeight: '600' }}>Clear Exhausted</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <Text style={{ color: colors.subText }}>
                  <Text style={{ color: '#f59e0b', fontWeight: '800' }}>{queueStatus.pending}</Text> Pending
                </Text>
                <Text style={{ color: colors.subText }}>
                  <Text style={{ color: '#ef4444', fontWeight: '800' }}>{queueStatus.exhausted}</Text> Exhausted
                </Text>
              </View>
            </View>
          )}

          {activeSession && showResumePrompt && (
            <SessionManager
              sessionData={activeSession}
              onResume={handleSessionResume}
              onDiscard={handleSessionDiscard}
              isLoading={sessionLoading}
            />
          )}

          <View style={styles.pillRow}>
            <Pill active={mode === "excel"} label="Import from Excel" onPress={() => setMode("excel")} />
            <Pill active={mode === "contacts"} label="Select Contacts" onPress={() => setMode("contacts")} />
          </View>

          {total > 0 && (
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.toolbarText, { color: colors.text }]}>📋 {total} recipients</Text>
                <Text style={[styles.toolbarHint, { color: colors.subText }]}>Unique numbers cleaned</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity onPress={() => setShowRecipientsModal(true)}>
                  <Text style={[styles.toolbarBtn, { color: colors.accent }]}>View All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearAllRecipients}>
                  <Text style={[styles.toolbarBtn, { color: "#ef4444" }]}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === "excel" && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.btnSecondary, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handlePickCsv}
                disabled={importLoading || sending}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
                  {importLoading ? "Loading…" : "📁 Pick Excel / CSV"}
                </Text>
              </TouchableOpacity>
              <View style={[styles.info, { marginTop: 10, backgroundColor: colors.background }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Import Summary</Text>
                <Text style={{ color: colors.text }}>Valid recipients: {excelRows.length}</Text>
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 4 }}>
                  Supports: CSV (.csv), Excel (.xlsx, .xls)
                </Text>
              </View>
            </View>
          )}

          {mode === "contacts" && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name or number…"
                placeholderTextColor={colors.subText}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
              <View style={{ height: 280, marginTop: 8 }}>
                {contactsLoading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <FlatList
                    data={filteredContacts}
                    keyExtractor={(i: any) => i.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }: { item: any }) => {
                      const selected = selectedIds.has(item.id);
                      return (
                        <TouchableOpacity
                          onPress={() => setSelectedIds(prev => {
                            const n = new Set(prev);
                            n.has(item.id) ? n.delete(item.id) : n.add(item.id);
                            return n;
                          })}
                          style={[styles.rowItem, { borderColor: colors.border }]}
                          disabled={sending}
                        >
                          <View>
                            <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.rowPhone, { color: colors.subText }]}>{item.phoneNumbers?.[0]}</Text>
                          </View>
                          <Text style={[styles.rowMark, selected ? { color: "#16a34a" } : { color: colors.subText }]}>
                            {selected ? "✓" : "+"}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                    {...getFixedHeightListProps(60)}
                  />
                )}
              </View>
            </View>
          )}

          <BulkProTemplate
            template={template}
            setTemplate={setTemplate}
            recents={recents}
            onSave={saveTemplate}
            onClearRecents={clearRecents}
            disabled={sending}
            availableFields={headers}
          />

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Send Speed</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              {[300, 600, 1000].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[styles.btnTiny, { backgroundColor: sendSpeed === speed ? "#16a34a" : colors.background }]}
                  onPress={() => setSendSpeed(speed)}
                >
                  <Text style={[styles.btnTinyText, { color: sendSpeed === speed ? "#fff" : colors.accent }]}>
                    {speed} ms
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <BulkProProgress
            sending={sending}
            sent={sent}
            failed={failed}
            queued={queued}
            total={total}
            paused={paused}
            sendSpeed={sendSpeed}
            delivered={delivered}
            smsStatus={smsStatus}
            onPauseResume={togglePause}
            onStop={stopSending}
            onSend={() => {
              // Pre-send confirmation for large batches
              if (total > 50) {
                const etaMins = Math.ceil((total * sendSpeed) / 60000);
                Alert.alert(
                  "Confirm Bulk Send",
                  `You are about to send ${total} messages.\n\nEstimated time: ~${etaMins} minute${etaMins > 1 ? 's' : ''}\n\nThis cannot be undone once started.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Send All", style: "default", onPress: handleSendWithBillingCheck }
                  ]
                );
              } else {
                handleSendWithBillingCheck();
              }
            }}
            onRetry={async () => {
              const count = await runQueueNow();
              alert(`${count} queued messages sent.`);
            }}
          />

          {total > 0 && (
            <View style={{ flex: 1, marginTop: 10, height: 300 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Preview (tap to edit)</Text>
              <FlatList
                data={mergedRecipients.slice(0, 50)} // Preview first 50
                keyExtractor={(_: any, i: number) => String(i)}
                renderItem={({ item }: { item: Recipient }) => (
                  <TouchableOpacity onPress={() => editRecipient(item)}>
                    <View style={[styles.previewItem, { borderColor: colors.border }]}>
                      <Text style={[styles.previewTitle, { color: colors.text }]}>
                        {item.name || "Unnamed"} · {item.phone}
                      </Text>
                      <Text style={[styles.previewBody, { color: colors.subText }]}>
                        {formatMessage(template, item)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                {...getLargeDatasetListProps(70)}
              />
            </View>
          )}

          <RecipientsModal visible={showRecipientsModal} recipients={mergedRecipients} onClose={() => setShowRecipientsModal(false)} onEdit={editRecipient} />
          <HeaderMappingModal
            visible={showMappingModal}
            headers={headers}
            amountCandidates={amountCandidates}
            sampleRows={sampleRows}
            mapping={headerMapping}
            onConfirm={(map) => {
              if (!map.name || !map.phone || !map.amount) return alert("Select all columns.");

              setExcelRows(allRawRows.map(r => ({
                name: String(r?.[map.name] ?? "").trim(),
                phone: normalizePhone(String(r?.[map.phone] ?? "").trim()),
                amount: Number(String(r?.[map.amount] ?? "0").replace(/,/g, "")) || 0
              })).filter(r => !!r.phone));
              setShowMappingModal(false);
            }}
            onCancel={() => setShowMappingModal(false)}
          />

          <EditModal visible={editVisible} recipient={editingRecipient} onSave={saveRecipient} onCancel={() => setEditVisible(false)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  pillRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  toolbar: { flexDirection: "row", justifyContent: "space-between", padding: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  toolbarText: { fontWeight: "700" },
  toolbarHint: { fontSize: 11, marginTop: 2 },
  toolbarBtn: { fontWeight: "700", fontSize: 12 },
  card: { padding: 12, borderRadius: 12, gap: 8, borderWidth: 1 },
  cardTitle: { fontWeight: "800", marginBottom: 6 },
  info: { padding: 10, borderRadius: 10, gap: 4 },
  infoTitle: { fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  rowItem: { paddingVertical: 10, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontWeight: "600" },
  rowPhone: { opacity: 0.75, fontSize: 12 },
  rowMark: { fontWeight: "800" },
  btnSecondary: { paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  btnSecondaryText: { fontWeight: "800" },
  btnTiny: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  btnTinyText: { fontWeight: "700" },
  previewItem: { paddingVertical: 8, borderBottomWidth: 1 },
  previewTitle: { fontWeight: "700" },
  previewBody: { fontSize: 12, opacity: 0.8 },
});