// ---------------------------------------------------------
// 🏪 Supermarket Payment Capture Pro — Stable v3.4 (FlatList + Theme)
// ---------------------------------------------------------
import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from "react-native";

import ProtectedRoute from "@/components/ProtectedRoute";
import { usePaymentCapture } from "@/hooks/usePaymentCapture";
import Toast from "react-native-toast-message";
import { useThemeSettings } from "@/theme/ThemeProvider";
import type { ThemePalette } from "@/theme/ThemeProvider";

// Unified core record type
import type { CustomerRecord } from "@/types/CustomerRecord";

// ---------------------------------------------------------
// LocalRecordItem (STRICT + SAFE)
// ---------------------------------------------------------
// Fix mismatch with CustomerRecord by making sure ID types align or extend correctly
// CustomerRecord id is number | undefined, so we must respect that.
interface LocalRecordItem extends Omit<CustomerRecord, 'id'> {
  id: string | number; // allow string id for local usage if needed
  displayName?: string;
  amount?: number;
  isOutgoing?: boolean;
}

type ThemeTokens = ReturnType<typeof buildThemeTokens>;

export default function SupermarketCapturePro(): JSX.Element {
  return (
    <ProtectedRoute>
      <SupermarketCaptureContent />
    </ProtectedRoute>
  );
}

function SupermarketCaptureContent(): JSX.Element {
  const {
    records,
    sample,
    loading,
    listening,
    search,
    setSearch,
    setSample,
    filteredRecords,
    handleParseAndSave,
    handleExportCSV,
    handleManualRefresh,
    toggleListener,
    scanInbox,
    openMpesaInbox,
    totalAmount,
  } = usePaymentCapture();

  const { theme, colors } = useThemeSettings();

  const t = useMemo(() => buildThemeTokens(theme, colors), [theme, colors]);
  const styles = useMemo(() => createStyles(), []);

  // -----------------------------------------------------
  // RenderItem
  // -----------------------------------------------------
  const renderItem = useCallback<ListRenderItem<LocalRecordItem>>(
    ({ item }) => (
      <RecordCard
        item={item}
        cardBg={t.card}
        text={t.text}
        subText={t.subText}
        chipBg={t.chipBg}
        accent={t.accent}
      />
    ),
    [t.card, t.text, t.subText, t.chipBg, t.accent]
  );

  // -----------------------------------------------------
  // Key Extractor
  // -----------------------------------------------------
  const keyExtractor = useCallback(
    (i: LocalRecordItem) => String(i.id || Math.random()),
    []
  );

  // -----------------------------------------------------
  // Header
  // -----------------------------------------------------
  const header = useMemo(
    () => (
      <Header
        t={t}
        styles={styles}
        recordsCount={records.length}
        totalAmount={totalAmount}
        search={search}
        setSearch={setSearch}
        loading={loading}
        listening={listening}
        openMpesaInbox={openMpesaInbox}
        toggleListener={toggleListener}
        scanInbox={scanInbox}
        handleExportCSV={handleExportCSV}
        handleManualRefresh={handleManualRefresh}
        sample={sample}
        setSample={setSample}
        handleParseAndSave={handleParseAndSave}
        filteredCount={filteredRecords.length}
      />
    ),
    [
      t,
      styles,
      records.length,
      totalAmount,
      search,
      setSearch,
      loading,
      listening,
      openMpesaInbox,
      toggleListener,
      scanInbox,
      handleExportCSV,
      handleManualRefresh,
      sample,
      setSample,
      handleParseAndSave,
      filteredRecords.length,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <FlatList
        data={filteredRecords as unknown as LocalRecordItem[]}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        refreshing={loading}
        onRefresh={handleManualRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: t.subText }]}>
              No transactions found.
            </Text>
          </View>
        }
      />
      <Toast />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   HEADER                                   */
/* -------------------------------------------------------------------------- */
interface HeaderProps {
  t: ThemeTokens;
  styles: ReturnType<typeof createStyles>;
  recordsCount: number;
  totalAmount: number;
  search: string;
  setSearch: (v: string) => void;
  loading: boolean;
  listening: boolean;
  openMpesaInbox: () => void;
  toggleListener: () => void;
  scanInbox: () => void;
  handleExportCSV: () => void;
  handleManualRefresh: () => void;
  sample: string;
  setSample: (v: string) => void;
  handleParseAndSave: () => void;
  filteredCount: number;
}

const Header = memo(function Header({
  t,
  styles,
  recordsCount,
  totalAmount,
  search,
  setSearch,
  loading,
  listening,
  openMpesaInbox,
  toggleListener,
  scanInbox,
  handleExportCSV,
  handleManualRefresh,
  sample,
  setSample,
  handleParseAndSave,
  filteredCount,
}: HeaderProps) {
  return (
    <View>
      <Text style={[styles.pageTitle, { color: t.text }]}>Payment Capture Pro</Text>
      <Text style={[styles.pageSubtitle, { color: t.subText }]}>
        Capture payments automatically or manually.
      </Text>

      <View style={[styles.summaryCard, { backgroundColor: t.card }]}>
        <Text style={[styles.summaryText, { color: t.text }]}>
          Total Payments: {recordsCount}
        </Text>
        <Text style={[styles.summarySubText, { color: t.subText }]}>
          Amount captured: KES {Number(totalAmount ?? 0).toLocaleString()}
        </Text>
      </View>

      <TextInput
        placeholder="Search name or phone..."
        placeholderTextColor={t.subText}
        value={search}
        onChangeText={setSearch}
        style={[
          styles.searchInput,
          { backgroundColor: t.card, color: t.text, borderColor: t.border },
        ]}
        autoCorrect={false}
        autoCapitalize="none"
      />

      <TouchableOpacity
        onPress={openMpesaInbox}
        disabled={loading}
        style={[styles.actionButton, { backgroundColor: t.btn.inbox }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionText}>📥 Open Inbox</Text>
        )}
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          onPress={toggleListener}
          disabled={loading}
          style={[
            styles.rowButton,
            { backgroundColor: listening ? t.btn.stop : t.btn.start },
          ]}
        >
          <Text style={styles.actionText}>
            {listening ? "🛑 Stop Auto" : "📡 Start Auto"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={scanInbox}
          disabled={loading}
          style={[styles.rowButton, { backgroundColor: t.btn.scan }]}
        >
          <Text style={styles.actionText}>📲 Scan Inbox</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportCSV}
          disabled={loading}
          style={[styles.rowButton, { backgroundColor: t.btn.export }]}
        >
          <Text style={styles.actionText}>📤 Export</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleManualRefresh}
        disabled={loading}
        style={[
          styles.actionButton,
          { backgroundColor: t.btn.refresh, marginTop: 10 },
        ]}
      >
        <Text style={styles.actionText}>♻️ Refresh Records</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Paste / Type Message</Text>

      <TextInput
        multiline
        value={sample}
        onChangeText={setSample}
        placeholder="Paste payment SMS..."
        placeholderTextColor={t.subText}
        style={[
          styles.sampleInput,
          { backgroundColor: t.card, color: t.text, borderColor: t.border },
        ]}
        textAlignVertical="top"
      />

      <TouchableOpacity
        onPress={handleParseAndSave}
        disabled={loading}
        style={[
          styles.actionButton,
          { backgroundColor: loading ? t.btn.disabled : t.btn.add, marginTop: 10, marginBottom: 20 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionText}>➕ Add</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: t.text, marginBottom: 10 }]}>
        Recent Payments ({filteredCount})
      </Text>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*                                RECORD CARD                                 */
/* -------------------------------------------------------------------------- */
const RecordCard = memo(function RecordCard({
  item,
  cardBg,
  text,
  subText,
  chipBg,
  accent,
}: {
  item: LocalRecordItem;
  cardBg: string;
  text: string;
  subText: string;
  chipBg: string;
  accent: ThemeTokens["accent"];
}) {
  const isOutgoing = item.type === "OUTGOING";
  const sideColor = isOutgoing ? accent.outL : accent.inL;
  const nameColor = isOutgoing ? accent.out : accent.in;

  return (
    <View style={[s.recordCard, { backgroundColor: cardBg, borderLeftColor: sideColor }]}>
      <View style={s.recordHeader}>
        <Text style={[s.recordName, { color: nameColor }]}>
          {item.name} ({item.transactionCount})
        </Text>
        <Text style={[s.recordPhone, { color: text }]}>{item.phone}</Text>
      </View>

      <Text
        numberOfLines={2}
        style={[s.recordMessage, { backgroundColor: chipBg, color: subText }]}
      >
        💬 {item.rawMessage}
      </Text>

      <Text style={[s.recordMeta, { color: subText }]}>
        {item.type} • Last Seen: {new Date(item.lastSeen).toLocaleTimeString()}
      </Text>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*                           THEME TOKEN BUILDER                              */
/* -------------------------------------------------------------------------- */
function buildThemeTokens(theme: "dark" | "light", palette: ThemePalette) {
  const isDark = theme === "dark";
  return {
    bg: palette.background,
    card: palette.card,
    text: palette.text,
    subText: palette.subText,
    chipBg: palette.chip,
    border: palette.border,
    btn: {
      inbox: isDark ? "#fbbf24" : "#f59e0b",
      start: palette.accent,
      stop: "#ef4444",
      scan: "#0284c7",
      export: "#16a34a",
      refresh: "#6b7280",
      add: palette.accent,
      disabled: "#9ca3af",
    },
    accent: {
      outL: "#f87171",
      inL: "#34d399",
      out: "#dc2626",
      in: "#065f46",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                    */
/* -------------------------------------------------------------------------- */
const s = StyleSheet.create({
  recordCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  recordName: { fontWeight: "700", fontSize: 16 },
  recordPhone: { fontWeight: "600" },
  recordMessage: { padding: 8, borderRadius: 8, fontSize: 12 },
  recordMeta: { marginTop: 4, fontSize: 12 },
});

/* Global styles creator */
function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, padding: 16 },
    pageTitle: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
    pageSubtitle: { opacity: 0.7, marginBottom: 10 },
    summaryCard: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 15,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
    },
    summaryText: { fontSize: 16, fontWeight: "700" },
    summarySubText: { fontSize: 14, opacity: 0.8 },
    searchInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      marginBottom: 15,
    },
    actionButton: {
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 10,
    },
    row: { flexDirection: "row", justifyContent: "space-between" },
    rowButton: {
      flex: 1,
      padding: 10,
      marginHorizontal: 5,
      borderRadius: 8,
      alignItems: "center",
    },
    actionText: { color: "white", fontWeight: "600" },
    sectionTitle: { fontWeight: "700", marginBottom: 6 },
    sampleInput: {
      minHeight: 100,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    emptyState: {
      padding: 20,
      borderRadius: 8,
      alignItems: "center",
    },
    emptyText: { fontSize: 14 },
  });
}
