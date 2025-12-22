import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Alert, InteractionManager } from "react-native";
import SecureStorage from "@/utils/SecureStorage";
import DocumentPicker, { types as DocumentTypes, isCancel } from "react-native-document-picker";
import ReactNativeBlobUtil from "react-native-blob-util";
import { parseCSV, autoSuggestMapping } from "@/utils/csvParser";
import { parseExcelSmart, isFileTypeSupported, getFileTypeDisplayName } from "@/utils/excelParser";
import { normalizePhone } from "@/utils/dataParsers";
import { ensureContactsPermission, getAllContacts, type SimpleContact } from "@/services/contacts";
import { saveSendLog } from "@/services/storage";
import { enqueueSMS, runQueueNow } from "@/background/smsWatcher";
import { sendSingleSms, canSendSms } from "@/services/smsService";
import { isDuplicateSend } from "@/db/repositories/sendLogs";
import type { Recipient } from "@/components/bulk-pro/EditModal";

const STORAGE_KEYS = {
    LAST_TEMPLATE: "bulkPro:lastMessageTemplate",
    RECENTS: "bulkPro:recentTemplates",
    EXCEL_ROWS: "bulkPro:excelRows",
    LAST_MODE: "bulkPro:lastMode",
};

export function useBulkPro() {
    const [mode, setMode] = useState<"excel" | "contacts">("excel");
    const [template, setTemplate] = useState("Hello {name}, your arrears are KES {amount}. Pay via Paybill 247777.");
    const [recents, setRecents] = useState<string[]>([]);
    const [excelRows, setExcelRows] = useState<Recipient[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [headers, setHeaders] = useState<string[]>([]);
    const [sampleRows, setSampleRows] = useState<Record<string, unknown>[]>([]);
    const [amountCandidates, setAmountCandidates] = useState<string[]>([]);
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [contacts, setContacts] = useState<SimpleContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(0);
    const [failed, setFailed] = useState(0);
    const [queued, setQueued] = useState(0);
    const [paused, setPaused] = useState(false);
    const [sendSpeed, setSendSpeed] = useState(400);
    const [smsStatus, setSmsStatus] = useState<"checking" | "ok" | "fail" | "unknown">("checking");
    const cancelledRef = useRef(false);
    const pausedRef = useRef(false);
    const sendingGateRef = useRef(false);
    const resumeResolverRef = useRef<(() => void) | null>(null);
    const sentRef = useRef(0);
    const failedRef = useRef(0);
    const queuedRef = useRef(0);
    const lastFlushRef = useRef(0);
    const lastFlushedCountRef = useRef(0);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const storedTemplate = await SecureStorage.getItem(STORAGE_KEYS.LAST_TEMPLATE);
                if (storedTemplate && mounted) setTemplate(storedTemplate);

                const recentsJson = await SecureStorage.getItem(STORAGE_KEYS.RECENTS);
                if (recentsJson && mounted) {
                    const parsed = JSON.parse(recentsJson);
                    if (Array.isArray(parsed)) setRecents(parsed.map((x) => String(x)));
                }

                const excelRowsJson = await SecureStorage.getItem(STORAGE_KEYS.EXCEL_ROWS);
                if (excelRowsJson && mounted) {
                    const parsed = JSON.parse(excelRowsJson);
                    if (Array.isArray(parsed)) setExcelRows(parsed);
                }

                const lastMode = await SecureStorage.getItem(STORAGE_KEYS.LAST_MODE);
                if (lastMode && mounted && (lastMode === "excel" || lastMode === "contacts")) {
                    setMode(lastMode);
                }

                const ok = await canSendSms();
                if (mounted) setSmsStatus(ok ? "ok" : "fail");
            } catch (e) {
                console.warn("BulkPro: init error", e);
                if (mounted) setSmsStatus("unknown");
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (excelRows.length > 0) {
            SecureStorage.setItem(STORAGE_KEYS.EXCEL_ROWS, JSON.stringify(excelRows))
                .catch((e: unknown) => console.warn("Failed to save excel rows:", e));
        }
    }, [excelRows]);

    useEffect(() => {
        SecureStorage.setItem(STORAGE_KEYS.LAST_MODE, mode)
            .catch((e: unknown) => console.warn("Failed to save mode:", e));
    }, [mode]);

    useEffect(() => {
        return () => {
            // Stop sending if user leaves the screen to prevent memory leaks/crashes
            cancelledRef.current = true;
            // If paused when unmounting, resolve the pause promise to unblock the loop
            if (pausedRef.current && resumeResolverRef.current) {
                resumeResolverRef.current();
                resumeResolverRef.current = null;
            }
        };
    }, []);

    const loadContacts = useCallback(async () => {
        try {
            setContactsLoading(true);
            const ok = await ensureContactsPermission();
            if (!ok) {
                Alert.alert("Permission", "Contacts permission denied.");
                return;
            }
            const list = await getAllContacts();
            setContacts(list);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert("Error", `Failed to load contacts: ${msg}`);
        } finally {
            setContactsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mode === "contacts" && contacts.length === 0) {
            loadContacts();
        }
    }, [mode, contacts.length, loadContacts]);

    async function handlePickCsv() {
        try {
            setImportLoading(true);
            const res = await DocumentPicker.pickSingle({
                type: [DocumentTypes.allFiles],
                copyTo: "cachesDirectory",
            });

            const fileUri = res.fileCopyUri || res.uri;
            if (!fileUri) throw new Error("No file URI");

            const name = res.name || "";

            if (!isFileTypeSupported(name)) {
                Alert.alert(
                    "Unsupported File",
                    "Please pick a CSV, Excel (.xlsx), or Excel (.xls) file.\n\nSupported formats:\n• CSV files (.csv)\n• Excel files (.xlsx, .xls)"
                );
                return;
            }

            const fileTypeDisplayName = getFileTypeDisplayName(name);
            let path = fileUri.startsWith("file://") ? fileUri.replace("file://", "") : fileUri;
            path = decodeURIComponent(path);

            try {
                const fs = require('react-native-fs');
                const fileExists = await fs.exists(path);
                if (!fileExists) {
                    throw new Error(`File not found: ${name}. The file may have been moved or deleted.`);
                }
            } catch (fsError) {
                console.warn('Could not verify file existence, attempting parse:', fsError);
            }

            const result = await parseExcelSmart(path, name);

            if (!result.rows.length) {
                Alert.alert("Import Error", `File is empty or has no valid data rows.\n\nDetected format: ${fileTypeDisplayName}`);
                return;
            }

            const json = result.rows.map(row => ({
                'FullNames': row.name,
                'PhoneNumber': row.phone,
                'Arrears Amount': row.amount
            }));

            const hdrs = Object.keys(json[0] || {});
            const { amountCandidates: cands } = autoSuggestMapping(hdrs);
            setHeaders(hdrs);
            setSampleRows(json);
            setAmountCandidates(cands || []);
            setShowMappingModal(true);

            Alert.alert(
                "Import Successful",
                `Successfully imported ${result.rows.length} records from ${fileTypeDisplayName} file.\n\nReady to map columns.`
            );
        } catch (e: unknown) {
            if (!isCancel(e)) {
                let msg = "Failed to parse file";
                if (e instanceof Error) {
                    if (e.message.includes('ENOENT') || e.message.includes('not found')) {
                        msg = "File not found. Please try selecting the file again.";
                    } else if (e.message.includes('permission')) {
                        msg = "Permission denied. Please check file permissions.";
                    } else if (e.message.includes('format')) {
                        msg = "Invalid file format. Please ensure the file is a valid CSV or Excel file.";
                    } else {
                        msg = e.message;
                    }
                }
                console.error("PickCSV error", e);
                Alert.alert("Import Error", msg);
            }
        } finally {
            setImportLoading(false);
        }
    }

    const contactsMap = useMemo(() => {
        const map = new Map<string, SimpleContact>();
        for (const c of contacts) {
            map.set(c.id, c);
        }
        return map;
    }, [contacts]);

    const pickedFromContacts: Recipient[] = useMemo(() => {
        const picked: Recipient[] = [];
        for (const id of selectedIds) {
            const c = contactsMap.get(id);
            if (c?.phoneNumbers?.[0]) {
                picked.push({ name: c.name, phone: c.phoneNumbers[0] });
            }
        }
        return picked;
    }, [contactsMap, selectedIds]);

    const [mergedRecipients, setMergedRecipients] = useState<Recipient[]>([]);

    useEffect(() => {
        const list = mode === "excel" ? excelRows : pickedFromContacts;
        const seen = new Set<string>();
        const out: Recipient[] = [];
        for (const r of list) {
            const key = normalizePhone(r.phone);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            out.push(r);
        }
        setMergedRecipients(out);
    }, [mode, excelRows, pickedFromContacts]);

    function formatMessage(tpl: string, r: Recipient) {
        try {
            return tpl
                .replace(/{name}/g, r.name ?? "")
                .replace(/{amount}/g, String(r.amount ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                .replace(/{phone}/g, r.phone ?? "");
        } catch (_) { return ""; }
    }

    async function saveTemplate() {
        if (!template.trim()) return;

        const next = [template, ...recents.filter((x) => x !== template)];

        try {
            await Promise.all([
                SecureStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(next)),
                SecureStorage.setItem(STORAGE_KEYS.LAST_TEMPLATE, template)
            ]);
            setRecents(next);
        } catch (e) {
            console.warn("Failed to save template:", e);
            Alert.alert("Warning", "Failed to save template to storage.");
        }
    }

    function clearRecents() {
        setRecents([]);
        SecureStorage.removeItem(STORAGE_KEYS.RECENTS);
    }

    function clearExcelRows() {
        setExcelRows([]);
        SecureStorage.removeItem(STORAGE_KEYS.EXCEL_ROWS);
    }

    async function handleSend() {
        if (sendingGateRef.current) return;
        sendingGateRef.current = true;

        if (!mergedRecipients.length) {
            Alert.alert("Error", "No recipients selected.");
            sendingGateRef.current = false;
            return;
        }

        const available = await canSendSms();
        if (!available) {
            Alert.alert("SMS Not Ready", "Queueing messages instead.");
            for (const r of mergedRecipients) {
                const body = formatMessage(template, r);
                const phone = normalizePhone(r.phone);
                if (phone) await enqueueSMS(phone, body);
            }
            sendingGateRef.current = false;
            return;
        }

        // Reset state
        cancelledRef.current = false;
        pausedRef.current = false;
        resumeResolverRef.current = null;

        // Reset counters
        sentRef.current = 0;
        failedRef.current = 0;
        queuedRef.current = 0;
        lastFlushRef.current = Date.now();
        lastFlushedCountRef.current = 0;

        setPaused(false);
        setSending(true);
        setSent(0);
        setFailed(0);
        setQueued(0);

        let index = 0;

        // Recursive processor to avoid blocking UI
        const processNext = async () => {
            // 1. Check Cancellation & Completion
            if (cancelledRef.current || index >= mergedRecipients.length) {
                // Final flush to ensure UI reflects final state
                setSent(sentRef.current);
                setFailed(failedRef.current);
                setQueued(queuedRef.current);

                setSending(false);
                sendingGateRef.current = false;
                return;
            }

            // 2. Pause Logic
            if (pausedRef.current) {
                await new Promise<void>((resolve) => {
                    resumeResolverRef.current = resolve;
                    if (cancelledRef.current) resolve();
                });
                // Re-check cancel after resume
                if (cancelledRef.current) {
                    setSent(sentRef.current);
                    setFailed(failedRef.current);
                    setQueued(queuedRef.current);
                    setSending(false);
                    sendingGateRef.current = false;
                    return;
                }
            }

            // 3. Process Message
            const r = mergedRecipients[index];
            const body = formatMessage(template, r);
            const phone = normalizePhone(r.phone);

            if (!phone) {
                failedRef.current += 1;
            } else {
                try {
                    // P0 FIX: Check for duplicate sends (same message to same number within 5 minutes)
                    const isDuplicate = await isDuplicateSend(phone, body, 5 * 60 * 1000);
                    if (isDuplicate) {
                        console.log(`[BulkPro] Skipping duplicate: ${phone}`);
                        // Don't count as failed, just skip
                        index++;
                        setTimeout(() => processNext(), sendSpeed);
                        return;
                    }

                    // Refactored to use service layer with Timeout Protection
                    const sendPromise = sendSingleSms(phone, body);
                    const timeoutPromise = new Promise<any>((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), 15000)
                    );

                    const result = await Promise.race([sendPromise, timeoutPromise]);

                    if (result.success) {
                        sentRef.current += 1;
                    } else {
                        failedRef.current += 1;
                        await enqueueSMS(phone, body);
                        queuedRef.current += 1;
                    }

                    await saveSendLog({
                        phone,
                        status: result.success ? "SENT" : "FAILED",
                        at: new Date().toISOString(),
                        error: result.error ? String(result.error) : undefined
                    });
                } catch (err) {
                    failedRef.current += 1;
                    await enqueueSMS(phone, body);
                    queuedRef.current += 1;
                    console.warn(`[BulkPro] Send failed or timed out: ${phone}`, err);
                }
            }

            index++;

            // Intelligent Flushing
            const now = Date.now();
            const totalProcessed = sentRef.current + failedRef.current;
            const diff = totalProcessed - lastFlushedCountRef.current;
            const timeDiff = now - lastFlushRef.current;

            // Flush every 20 messages or 500ms
            if (diff >= 20 || timeDiff >= 500) {
                setSent(sentRef.current);
                setFailed(failedRef.current);
                setQueued(queuedRef.current);
                lastFlushRef.current = now;
                lastFlushedCountRef.current = totalProcessed;
            }

            // 4. Schedule next chunk
            // Using setTimeout ensures we yield to event loop. 
            // InteractionManager.runAfterInteractions ensures we don't block checks.
            setTimeout(() => {
                processNext();
            }, sendSpeed);
        };

        // Kickoff
        processNext();
    }

    function togglePause() {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);

        // If resuming, resolve the waiting promise
        if (!pausedRef.current && resumeResolverRef.current) {
            resumeResolverRef.current();
            resumeResolverRef.current = null;
        }
    }

    function stopSending() {
        cancelledRef.current = true;

        // If paused when stopping, resolve the pause promise to unblock the loop
        if (pausedRef.current && resumeResolverRef.current) {
            resumeResolverRef.current();
            resumeResolverRef.current = null;
        }
    }

    return {
        mode, setMode,
        template, setTemplate,
        recents, saveTemplate, clearRecents,
        excelRows, setExcelRows, clearExcelRows,
        importLoading, handlePickCsv,
        headers, sampleRows, amountCandidates, showMappingModal, setShowMappingModal,
        contacts, contactsLoading, selectedIds, setSelectedIds, query, setQuery,
        mergedRecipients,
        sending, sent, failed, queued, paused, sendSpeed, setSendSpeed,
        handleSend, togglePause, stopSending,
        smsStatus,
        runQueueNow,
        formatMessage,
        normalizePhone
    };
}