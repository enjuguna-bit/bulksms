import { useState, useEffect, useMemo, useCallback } from "react";
import { Alert, InteractionManager } from "react-native";

// Import the focused hooks we created
import { useBulkSmsCounters } from "./useBulkSmsCounters";
import { useBulkSmsControl } from "./useBulkSmsControl";
import { useBulkSmsQueueStatus } from "./useBulkSmsQueueStatus";
import { useBulkSmsConfig } from "./useBulkSmsConfig";
import { useBulkSmsSession } from "./useBulkSmsSession";
import { useSmsStatusAndTemplates } from "./useSmsStatusAndTemplates";

// Existing imports for functionality that remains
import SecureStorage from "@/utils/SecureStorage";
import DocumentPicker, { types as DocumentTypes, isCancel } from "react-native-document-picker";
import ReactNativeBlobUtil from "react-native-blob-util";
import { parseCSV, autoSuggestMapping } from "@/utils/csvParser";
import { parseExcelSmart, parseImportFile, isFileTypeSupported, getFileTypeDisplayName } from "@/utils/excelParser";
import { normalizePhone } from "@/utils/dataParsers";
import { ensureContactsPermission, getAllContacts, type SimpleContact } from "@/services/contacts";
import { saveSendLog } from "@/services/storage";
import { enqueueSMS, runQueueNow } from "@/background/smsWatcher";
import { sendSingleSms } from "@/services/smsService";
import { subscriptionManager } from "@/services/billing/SubscriptionManager";
import { isDuplicateSend } from "@/db/repositories/sendLogs";

// New messaging schema imports
import {
    getOrCreateConversation,
    insertMessage,
    updateMessageStatus,
} from "@/db/messaging";

// Session persistence imports
import { processContacts, contactRecordToRecipient } from "@/services/excelProcessor";
import type { Recipient, ExcelRow } from "@/types/bulkSms";

const STORAGE_KEYS = {
    EXCEL_ROWS: "bulkPro:excelRows",
    LAST_MODE: "bulkPro:lastMode",
};

/**
 * REFACTORED: useBulkPro hook - now uses focused sub-hooks for better maintainability
 * Reduced from 760+ lines to focused composition of smaller hooks
 */
export function useBulkPro() {
    const [mode, setMode] = useState<"excel" | "contacts">("excel");
    const [excelRows, setExcelRows] = useState<Recipient[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [headers, setHeaders] = useState<string[]>([]);
    const [sampleRows, setSampleRows] = useState<ExcelRow[]>([]);
    const [allRawRows, setAllRawRows] = useState<ExcelRow[]>([]);
    const [amountCandidates, setAmountCandidates] = useState<string[]>([]);
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [contacts, setContacts] = useState<SimpleContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState("");

    // Use the focused hooks
    const counters = useBulkSmsCounters();
    const control = useBulkSmsControl();
    const config = useBulkSmsConfig();
    const session = useBulkSmsSession(setExcelRows);
    const templates = useSmsStatusAndTemplates();
    const queueStatus = useBulkSmsQueueStatus(control.sending);

    // Load persisted data on mount
    useEffect(() => {
        const loadPersistedData = async () => {
            try {
                // Load excel rows if no active session
                if (!session.activeSession) {
                    const excelRowsJson = await SecureStorage.getItem(STORAGE_KEYS.EXCEL_ROWS);
                    if (excelRowsJson) {
                        const parsed = JSON.parse(excelRowsJson);
                        if (Array.isArray(parsed)) setExcelRows(parsed);
                    }
                }

                // Load last mode
                const lastMode = await SecureStorage.getItem(STORAGE_KEYS.LAST_MODE);
                if (lastMode && (lastMode === "excel" || lastMode === "contacts")) {
                    setMode(lastMode);
                }
            } catch (e) {
                console.warn("BulkPro: Failed to load persisted data", e);
            }
        };

        // Defer loading until after navigation transition
        InteractionManager.runAfterInteractions(loadPersistedData);
    }, [session.activeSession]);

    // Persist excel rows
    useEffect(() => {
        if (excelRows.length > 0) {
            SecureStorage.setItem(STORAGE_KEYS.EXCEL_ROWS, JSON.stringify(excelRows))
                .catch((e) => console.warn("Failed to save excel rows:", e));
        }
    }, [excelRows]);

    // Persist mode
    useEffect(() => {
        SecureStorage.setItem(STORAGE_KEYS.LAST_MODE, mode)
            .catch((e) => console.warn("Failed to save mode:", e));
    }, [mode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Stop sending if user leaves the screen
            control.stopSending();
        };
    }, [control]);

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

    // Load contacts when mode changes to contacts
    useEffect(() => {
        if (mode === "contacts" && contacts.length === 0) {
            loadContacts();
        }
    }, [mode, contacts.length, loadContacts]);

    // Contacts processing
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

    // Dynamic placeholder replacement
    function formatMessage(tpl: string, r: Recipient) {
        try {
            let result = tpl;

            // Built-in placeholders
            result = result
                .replace(/{name}/gi, r.name ?? "")
                .replace(/{phone}/gi, r.phone ?? "")
                .replace(/{amount}/gi, String(r.amount ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ","));

            // Dynamic placeholders from Excel fields
            if (r.fields) {
                for (const [key, value] of Object.entries(r.fields)) {
                    const regex = new RegExp(`\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'gi');
                    let displayValue = '';

                    if (value !== null && value !== undefined) {
                        if (typeof value === 'number') {
                            displayValue = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        } else {
                            displayValue = String(value);
                        }
                    }

                    result = result.replace(regex, displayValue);
                }
            }

            return result;
        } catch (_) { return tpl; }
    }

    // CSV/Excel import handler
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

            // Enhanced processing with validation
            const rawData = await parseImportFile(path, name);
            const rawRows = rawData as unknown as ExcelRow[];

            if (!rawRows.length) {
                Alert.alert("Import Error", `File is empty or has no valid data rows.\n\nDetected format: ${fileTypeDisplayName}`);
                setImportLoading(false);
                return;
            }

            const processed = await processContacts(rawRows);

            // Create session data
            const sessionData: any = {
                fileId: `upload_${Date.now()}`,
                fileName: name,
                uploadTimestamp: Date.now(),
                lastAccessed: Date.now(),
                parsedData: processed.validContacts,
                totalRecords: rawRows.length,
                validRecords: processed.validContacts.length,
                invalidRecords: processed.invalidContacts.length,
                processingStatus: processed.invalidContacts.length > 0 ? 'processing' : 'processed',
                columnMapping: processed.columnMapping,
                previewData: (rawRows.slice(0, 5) as unknown as ExcelRow[]),
                isActive: true
            };

            // Save session
            await session.saveSession(sessionData);
            session.handleSessionResume();

            // Legacy support: Convert to Recipients
            const recipients = processed.validContacts.map(contactRecordToRecipient);
            setExcelRows(recipients);

            // Setup UI for mapping
            const actualHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
            setHeaders(actualHeaders);
            setSampleRows(rawRows.slice(0, 10));
            setAllRawRows(rawRows);

            const { amountCandidates: cands } = autoSuggestMapping(actualHeaders);
            setAmountCandidates(cands || []);

            setShowMappingModal(true);

            Alert.alert(
                "Import Successful",
                `Imported ${processed.validContacts.length} valid contacts.\n${processed.invalidContacts.length} invalid records skipped.`
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

    // Main send handler
    async function handleSend() {
        if (!control.canSend()) return;

        // Check subscription
        const hasAccess = await subscriptionManager.hasActiveAccess();
        if (!hasAccess) {
            return { blocked: true, reason: "subscription_expired" };
        }

        if (!mergedRecipients.length) {
            Alert.alert("Error", "No recipients selected.");
            return;
        }

        const available = await sendSingleSms("", "", 0); // Just check capability
        if (!available.success) {
            Alert.alert("SMS Not Ready", "Queueing messages instead.");
            await queueMessagesForSending();
            return;
        }

        // Start sending process
        if (!control.startSending()) return;

        const bulkId = config.generateBulkId();
        console.log(`[BulkPro] Starting bulk send with bulkId: ${bulkId}, simSlot: ${config.simSlot}`);

        const controller = new AbortController();
        counters.resetCounters();

        try {
            const timeoutConfig = {
                base: 10000,
                retries: [15000, 20000, 25000],
            };

            let index = 0;
            const totalRecipients = mergedRecipients.length;

            if (totalRecipients > 1000) {
                console.log(`[BulkPro] Large batch detected (${totalRecipients}), using optimized streaming mode`);
            }

            for (const recipient of mergedRecipients) {
                // Check cancellation
                if (controller.signal.aborted || control.isCancelled()) {
                    console.log('[BulkPro] Send cancelled by user');
                    break;
                }

                // Handle pause
                await control.waitIfPaused();
                if (controller.signal.aborted || control.isCancelled()) {
                    break;
                }

                // Process message
                const body = formatMessage(templates.template, recipient);
                const phone = normalizePhone(recipient.phone);

                if (!phone) {
                    counters.incrementFailed();
                    index++;
                    continue;
                }

                let dbMessageId: number | null = null;

                try {
                    const isDuplicate = await isDuplicateSend(phone, body, 5 * 60 * 1000);
                    if (isDuplicate) {
                        console.log(`[BulkPro] Skipping duplicate: ${phone}`);
                        index++;
                        await new Promise((r) => setTimeout(r, config.sendSpeed));
                        continue;
                    }

                    const conversation = await getOrCreateConversation(phone, recipient.name);
                    const dbMessage = await insertMessage(
                        conversation.id,
                        phone,
                        body,
                        'outgoing',
                        'pending'
                    );
                    dbMessageId = dbMessage.id;

                    const sendPromise = sendSingleSms(phone, body, config.simSlot);
                    const timeoutPromise = new Promise<any>((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), timeoutConfig.base)
                    );

                    const abortPromise = new Promise<any>((_, reject) => {
                        controller.signal.addEventListener('abort', () => reject(new Error("Aborted")));
                    });

                    const result = await Promise.race([sendPromise, timeoutPromise, abortPromise]);

                    if (result.success) {
                        counters.incrementSent();
                        await updateMessageStatus(dbMessageId, 'sent');
                    } else {
                        counters.incrementFailed();
                        await updateMessageStatus(dbMessageId, 'failed');
                        counters.incrementQueued();
                        await enqueueSMS(phone, body, config.simSlot, dbMessageId);
                    }

                    await saveSendLog({
                        phone,
                        status: result.success ? "SENT" : "FAILED",
                        at: new Date().toISOString(),
                        error: result.error ? String(result.error) : undefined
                    });
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);

                    if (errMsg === "Aborted") {
                        break;
                    }

                    counters.incrementFailed();
                    if (dbMessageId) {
                        await updateMessageStatus(dbMessageId, 'failed').catch(() => { });
                    }
                    counters.incrementQueued();
                    await enqueueSMS(phone, body, config.simSlot, dbMessageId || undefined);
                    console.warn(`[BulkPro] Send failed: ${phone}`, err);
                }

                index++;

                // Intelligent flushing
                const now = Date.now();
                const totalProcessed = counters.sentRef.current + counters.failedRef.current;
                const flushThreshold = totalRecipients > 1000 ? 1000 : 500;

                // Simple flushing logic - flush every 20 messages or based on time
                const lastFlush = (counters as any).lastFlushRef?.current || 0;
                const lastCount = (counters as any).lastFlushedCountRef?.current || 0;
                const diff = totalProcessed - lastCount;

                if (diff >= 20 || (now - lastFlush) >= flushThreshold) {
                    counters.flushCounters();
                    (counters as any).lastFlushRef = (counters as any).lastFlushRef || { current: 0 };
                    (counters as any).lastFlushedCountRef = (counters as any).lastFlushedCountRef || { current: 0 };
                    (counters as any).lastFlushRef.current = now;
                    (counters as any).lastFlushedCountRef.current = totalProcessed;
                }

                await new Promise((r) => setTimeout(r, config.sendSpeed));
            }
        } catch (err) {
            console.error('[BulkPro] Unexpected error in send loop', err);
        } finally {
            counters.flushCounters();
            control.stopSending();
            config.resetBulkId();

            console.log(`[BulkPro] Send complete. Sent: ${counters.sentRef.current}, Failed: ${counters.failedRef.current}, Queued: ${counters.queuedRef.current}`);
        }
    }

    async function queueMessagesForSending() {
        for (const r of mergedRecipients) {
            const body = formatMessage(templates.template, r);
            const phone = normalizePhone(r.phone);

            if (phone) {
                const isDuplicate = await isDuplicateSend(phone, body, 5 * 60 * 1000);
                if (!isDuplicate) {
                    try {
                        const conversation = await getOrCreateConversation(phone, r.name);
                        const dbMessage = await insertMessage(
                            conversation.id,
                            phone,
                            body,
                            'outgoing',
                            'pending'
                        );

                        await enqueueSMS(phone, body, config.simSlot, dbMessage.id);
                    } catch (err) {
                        console.warn(`[BulkPro] DB insert failed for queued msg: ${phone}`, err);
                        await enqueueSMS(phone, body, config.simSlot);
                    }
                }
            }
        }
    }

    function clearExcelRows() {
        setExcelRows([]);
        SecureStorage.removeItem(STORAGE_KEYS.EXCEL_ROWS).catch((e) =>
            console.warn("Failed to clear excel rows:", e)
        );
    }

    // Return interface
    return {
        mode, setMode,
        template: templates.template, setTemplate: templates.setTemplate,
        recents: templates.recents, saveTemplate: templates.saveTemplate, clearRecents: templates.clearRecents,
        excelRows, setExcelRows, clearExcelRows,
        importLoading, handlePickCsv,
        headers, sampleRows, allRawRows, amountCandidates, showMappingModal, setShowMappingModal,
        contacts, contactsLoading, selectedIds, setSelectedIds, query, setQuery,
        mergedRecipients,
        sending: control.sending, sent: counters.sent, failed: counters.failed, queued: counters.queued, paused: control.paused, sendSpeed: config.sendSpeed, setSendSpeed: config.setSendSpeed,
        simSlot: config.simSlot, setSimSlot: config.setSimSlot,
        currentBulkId: config.currentBulkId,
        handleSend, togglePause: control.togglePause, stopSending: control.stopSending,
        smsStatus: templates.smsStatus,
        runQueueNow,
        formatMessage,
        normalizePhone,
        // Session exports
        activeSession: session.activeSession,
        showResumePrompt: session.showResumePrompt,
        handleSessionResume: session.handleSessionResume,
        handleSessionDiscard: session.handleSessionDiscard,
        sessionLoading: session.sessionLoading,
        // Queue status exports
        queueStatus: queueStatus.queueStatus,
        refreshQueueStatus: queueStatus.refreshQueueStatus,
        clearExhausted: queueStatus.clearExhausted,
    };
}
