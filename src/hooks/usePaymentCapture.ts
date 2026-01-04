// ---------------------------------------------------------
// 📡 src/hooks/usePaymentCapture.ts — v3.5 (Optimized)
// 🪝 Fully Functional Payment Capture Hook + Diagnostics
// ---------------------------------------------------------

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Platform,
  Linking,
  PermissionsAndroid,
  Alert,
  AppState,
  AppStateStatus,
  Share,
} from "react-native";

import Toast from "react-native-toast-message";
import { parseMobileMoneyMessage } from "@/utils/parseMobileMoney";
import { exportCustomerRecordsToCSV } from "@/utils/export-csv";
import { smsListener } from "@/native";
import { syncRecordWithPOS } from "@/services/pos";
import { useDebounce } from "@/utils/useDebounce";

import { upsertPaymentRecord, getPaymentRecords, clearOldPaymentRecords } from "@/db/repositories/paymentRecords";
import { getMessagesByAddress, type MessageRow } from "@/db/repositories/messages";
import type { CustomerRecord } from "@/db/repositories/paymentRecords";

import { CONFIG } from "@/constants/config";

// ✅ NEW: M-PESA inbox scanning and Excel export
import { scanMpesaInbox, getSavedTransactions, type ScanResult, type ScanProgress } from "@/services/MpesaInboxScanner";
import { exportAndShareMpesaExcel, exportMpesaTransactionsToCSV } from "@/utils/exportMpesaExcel";
import type { ParsedMpesaTransaction } from "@/utils/parseMpesaEnhanced";

export type { ScanProgress };

export type RecordItem = CustomerRecord;

// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------
const MAX_AGE = CONFIG.PAYMENT_RECORD_MAX_AGE_MS;
const API_BASE_URL = CONFIG.PAYMENT_API_BASE_URL;

// ---------------------------------------------------------
// Payment message detector
// ---------------------------------------------------------
const isPaymentMessage = (m: string) => {
  const u = m.toUpperCase();
  return (
    u.includes("M-PESA") ||
    u.includes("M PESA") ||
    u.includes("MPESA") ||
    u.includes("RECEIVED") ||
    u.includes("CONFIRMED") ||
    u.includes("PAID") ||
    u.startsWith("CONFIRMED") ||
    u.startsWith("YOU HAVE")
  );
};

// =========================================================
// HOOK START
// =========================================================
export function usePaymentCapture() {
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [sample, setSample] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [search, setSearch] = useState("");
  const [hasSmsPermission, setHasSmsPermission] = useState(false);

  // ⭐ NEW FOR DIAGNOSTICS
  const [lastParsed, setLastParsed] = useState<any>(null);
  const [lastError, setLastError] = useState<any>(null);

  // ✅ NEW: M-PESA transactions state
  const [mpesaTransactions, setMpesaTransactions] = useState<ParsedMpesaTransaction[]>([]);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  const debouncedSearch = useDebounce(search);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const listenerRef = useRef<{ remove(): void } | null>(null);

  // ---------------------------------------------------------
  // Sort helper
  // ---------------------------------------------------------
  const sortRecords = useCallback(
    (l: CustomerRecord[]) =>
      [...l].sort((a, b) =>
        b.transactionCount === a.transactionCount
          ? b.lastSeen - a.lastSeen
          : b.transactionCount - a.transactionCount
      ),
    []
  );

  // ---------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------
  const ensureSmsPermission = useCallback(async () => {
    if (Platform.OS !== "android") return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert("Permission Denied", "Enable SMS permission in Settings.", [
        { text: "Open Settings", onPress: () => Linking.openSettings() },
        { text: "Cancel", style: "cancel" },
      ]);
      return false;
    }
    return true;
  }, []);



  // ---------------------------------------------------------
  // Storage helpers - Now using SQLite
  // ---------------------------------------------------------
  const loadStoredRecords = useCallback(async (): Promise<CustomerRecord[]> => {
    try {
      return await getPaymentRecords(MAX_AGE);
    } catch (err) {
      console.warn("[usePaymentCapture] load error", err);
      return [];
    }
  }, []);

  const persistRecords = useCallback(async (next: CustomerRecord[]) => {
    try {
      for (const record of next) {
        await upsertPaymentRecord(record);
      }
    } catch (err) {
      console.warn("[usePaymentCapture] persist error", err);
    }
  }, []);

  const pruneOldRecords = useCallback(async () => {
    await clearOldPaymentRecords(MAX_AGE);
    const fresh = await getPaymentRecords(MAX_AGE);
    return sortRecords(fresh);
  }, [sortRecords]);

  // ---------------------------------------------------------
  // INCOMING MESSAGE PROCESSOR (core)
  // ---------------------------------------------------------
  const handleIncomingMessage = useCallback(
    async (message: string) => {
      if (!isPaymentMessage(message)) return;

      try {
        const parsed = parseMobileMoneyMessage(message);

        // ⭐ Diagnostics update
        setLastParsed(parsed);
        setLastError(null);

        const name = parsed?.name ?? "";
        const phone = parsed?.phone ?? "";
        if (!name || !phone) return;

        const now = Date.now();

        setRecords((prev) => {
          const idx = prev.findIndex((r) => r.phone === phone);

          if (idx !== -1) {
            const updated: CustomerRecord = {
              ...prev[idx],
              name,
              rawMessage: message,
              lastSeen: now,
              type: parsed?.type ?? prev[idx].type,
              transactionCount: prev[idx].transactionCount + 1,
            };
            const sorted = sortRecords([
              ...prev.slice(0, idx),
              updated,
              ...prev.slice(idx + 1),
            ]);
            void persistRecords(sorted);
            void syncRecordWithPOS({ ...updated, id: String(updated.id || "") });
            return sorted;
          }

          // ✅ FIX: Generate unique ID for new record
          const newRecord: CustomerRecord = {
            id: undefined, // Let DB assign ID, or keyExtractor handle it
            name,
            phone,
            rawMessage: message,
            type: parsed?.type ?? "INCOMING",
            lastSeen: now,
            transactionCount: 1,
          };

          const sorted = sortRecords([newRecord, ...prev]);
          void persistRecords(sorted);
          void syncRecordWithPOS({ ...newRecord, id: String(newRecord.id || "") });
          return sorted;
        });

        Toast.show({
          type: "success",
          text1: "💰 Payment Captured",
          text2: `${name} (${phone})`,
        });
      } catch (err) {
        setLastError(err);
        console.log("[handleIncomingMessage] parsing error", err);
      }
    },
    [persistRecords, sortRecords]
  );

  // ---------------------------------------------------------
  // ✅ Inbox Scanner - RE-ENABLED with M-PESA parsing + Progress
  // ---------------------------------------------------------
  const scanInbox = useCallback(async () => {
    if (Platform.OS !== "android") {
      Toast.show({ type: "info", text1: "Only available on Android" });
      return;
    }

    setLoading(true);
    setScanProgress({ current: 0, total: 100, phase: 'reading' });
    try {
      Toast.show({ type: "info", text1: "🔍 Scanning inbox...", text2: "Please wait" });

      const result = await scanMpesaInbox({
        limit: 500,
        saveToDb: true,
        onProgress: (progress) => {
          setScanProgress(progress);
        },
      });

      setLastScanResult(result);
      setMpesaTransactions(result.transactions);

      // Convert to CustomerRecords for compatibility with existing UI
      for (const tx of result.transactions) {
        if (tx.phone) {
          const fakeMsg = `${tx.reference} Confirmed. Ksh${tx.amount} ${tx.type === 'RECEIVED' ? 'received from' : 'sent to'} ${tx.name} ${tx.phone}`;
          await handleIncomingMessage(fakeMsg);
        }
      }

      Toast.show({
        type: "success",
        text1: `✅ Found ${result.mpesaFound} M-PESA transactions`,
        text2: `New: ${result.newSaved}, Duplicates: ${result.duplicatesSkipped}`,
      });

      // Prompt to export
      if (result.transactions.length > 0) {
        Alert.alert(
          "Scan Complete",
          `Found ${result.transactions.length} transactions. Would you like to export them to Excel?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Export & Share",
              onPress: () => {
                // Determine transactions to export - use result directly to ensure we have the latest
                // We wrap this in a timeout to ensure state updates have processed if needed, 
                // though passing data directly is safer.
                exportAndShareMpesaExcel(result.transactions, {
                  includeRawMessage: false,
                }).then(success => {
                  if (success) Toast.show({ type: "success", text1: "✅ Export successful" });
                });
              }
            }
          ]
        );
      }
    } catch (err: any) {
      console.error("[scanInbox] Error:", err);
      Toast.show({ type: "error", text1: "Scan failed", text2: err?.message || "Unknown error" });
    } finally {
      setLoading(false);
      setScanProgress(null);
    }
  }, [handleIncomingMessage]);

  // ---------------------------------------------------------
  // Sync with server
  // ---------------------------------------------------------
  const fetchServerTransactions = useCallback(
    async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/transactions`);
        if (!res.ok) return;
        const data = await res.json();

        for (const t of data) {
          const fakeMsg = `Confirmed. KES ${t.amount} received from ${t.name} ${t.phone}`;
          await handleIncomingMessage(fakeMsg);
        }
      } catch (err) {
        console.log("Server sync failed:", err);
      }
    },
    [handleIncomingMessage]
  );

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  useEffect(() => {
    (async () => {
      const pruned = await pruneOldRecords();
      setRecords(pruned);

      const granted = await ensureSmsPermission();
      setHasSmsPermission(granted);

      if (Platform.OS === "android" && granted) {
        const sub = smsListener.addListener((payload) => {
          handleIncomingMessage(payload.body);
        });
        listenerRef.current = sub;
        setListening(true);
      }
    })();

    return () => {
      listenerRef.current?.remove?.();
      setListening(false);
    };
  }, [ensureSmsPermission, pruneOldRecords, handleIncomingMessage]);

  // ---------------------------------------------------------
  // App foreground resume
  // ---------------------------------------------------------
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === "active"
      ) {
        setTimeout(() => {
          fetchServerTransactions();
        }, 800);
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [fetchServerTransactions]);

  // ---------------------------------------------------------
  // Controls
  // ---------------------------------------------------------
  const toggleListener = useCallback(async () => {
    if (listening) {
      listenerRef.current?.remove?.();
      setListening(false);
    } else {
      const started = smsListener.addListener((payload) => {
        handleIncomingMessage(payload.body);
      });
      listenerRef.current = started;
      setListening(true);
    }
  }, [listening, handleIncomingMessage]);

  const handleParseAndSave = useCallback(async () => {
    if (!sample.trim()) return;

    setLoading(true);
    try {
      await handleIncomingMessage(sample);
      setSample("");
    } finally {
      setLoading(false);
    }
  }, [sample, handleIncomingMessage]);

  const handleExportCSV = useCallback(async () => {
    try {
      const csvUri = await exportCustomerRecordsToCSV(records);

      await Share.share({
        url: csvUri,
        message: "Customer payment capture records.",
        title: "Exported records",
      });
    } catch (err: any) {
      Alert.alert("Export Error", String(err?.message || err));
    }
  }, [records]);

  // ✅ NEW: Export to Excel with full M-PESA data
  const handleExportExcel = useCallback(async () => {
    try {
      setLoading(true);

      // Get transactions from database if not already loaded
      let transactionsToExport = mpesaTransactions;
      if (transactionsToExport.length === 0) {
        transactionsToExport = await getSavedTransactions(1000);
      }

      if (transactionsToExport.length === 0) {
        Alert.alert("No Data", "No M-PESA transactions found. Scan inbox first.");
        return;
      }

      Toast.show({ type: "info", text1: "📊 Generating Excel...", text2: `${transactionsToExport.length} transactions` });

      const success = await exportAndShareMpesaExcel(transactionsToExport, {
        includeRawMessage: false,
      });

      if (success) {
        Toast.show({ type: "success", text1: "✅ Excel exported successfully" });
      }
    } catch (err: any) {
      Alert.alert("Export Error", String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [mpesaTransactions]);

  const handleManualRefresh = useCallback(
    async () => {
      const refreshed = await pruneOldRecords();
      setRecords(refreshed);
      await fetchServerTransactions();
    },
    [fetchServerTransactions, pruneOldRecords]
  );

  // ---------------------------------------------------------
  // Derived
  // ---------------------------------------------------------
  const filteredRecords = useMemo(
    () =>
      sortRecords(
        records.filter(
          (r) =>
            r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            r.phone.includes(debouncedSearch)
        )
      ),
    [records, debouncedSearch, sortRecords]
  );

  const totalAmount = useMemo(
    () =>
      records.reduce((sum, r) => {
        const match = r.rawMessage.match(/KES\s?([\d,]+)/i);
        const num = match ? Number(match[1].replace(/,/g, "")) : 0;
        return sum + num;
      }, 0),
    [records]
  );

  // ---------------------------------------------------------
  // RETURN — API v4.0 (with M-PESA scanning & Excel export)
  // ---------------------------------------------------------
  return {
    // core
    records,
    filteredRecords,
    sample,
    setSample,
    search,
    setSearch,
    loading,
    listening,
    totalAmount,

    // ✅ NEW: M-PESA transactions
    mpesaTransactions,
    lastScanResult,
    scanProgress, // ✅ Progress state for UI

    // actions
    handleParseAndSave,
    handleExportCSV,
    handleExportExcel, // ✅ NEW: Excel export
    handleManualRefresh,
    toggleListener,
    scanInbox,
    fetchServerTransactions,
    openMpesaInbox: () => Linking.openURL("sms:"),

    // exposed parser
    handleIncomingMessage,

    // diagnostics
    lastParsed,
    lastError,
  };
}