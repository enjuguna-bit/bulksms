import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { DeviceEventEmitter } from "react-native";
import { Alert, InteractionManager } from "react-native";
import SecureStorage from "@/utils/SecureStorage";
import DocumentPicker, { types as DocumentTypes, isCancel } from "react-native-document-picker";
import ReactNativeBlobUtil from "react-native-blob-util";
import { parseCSV, autoSuggestMapping } from "@/utils/csvParser";
import { parseExcelSmart, parseImportFile, isFileTypeSupported, getFileTypeDisplayName } from "@/utils/excelParser";
import { normalizePhone } from "@/utils/dataParsers";
import { ensureContactsPermission, getAllContacts, type SimpleContact } from "@/services/contacts";
import { saveSendLog } from "@/services/storage";
import { enqueueSMS, runQueueNow, getCircuitBreakerStatus } from "@/background/smsWatcher";
import { sendSingleSms, canSendSms } from "@/services/smsService";
import { subscriptionManager } from "@/services/billing/SubscriptionManager";
import { isDuplicateSend } from "@/db/repositories/sendLogs";
import { getQueueStats, clearExhaustedMessages } from "@/db/repositories/smsQueue";
import type { Recipient, ExcelRow } from "@/types/bulkSms";

// New messaging schema imports for write-ahead pattern
import {
    getOrCreateConversation,
    insertMessage,
    updateMessageStatus,
} from "@/db/messaging";

// Session persistence imports
import uploadPersistence from "@/services/uploadPersistence";
import { cleanupExpiredSessions } from "@/services/sessionCleanup";
import { processContacts, contactRecordToRecipient } from "@/services/excelProcessor";
import type { ExcelUploadData, ContactRecord } from "@/types/bulkSms";
import { ensureDefaultSmsApp } from "@/services/defaultSmsRole";

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
    const [sampleRows, setSampleRows] = useState<ExcelRow[]>([]);
    const [allRawRows, setAllRawRows] = useState<ExcelRow[]>([]);
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
    const [delivered, setDelivered] = useState(0);
    const [currentBulkId, setCurrentBulkId] = useState<string | null>(null);
    const [smsStatus, setSmsStatus] = useState<"checking" | "ok" | "fail" | "unknown">("checking");

    // SIM slot selection state
    const [simSlot, setSimSlot] = useState(0);

    // Session persistence state
    const [activeSession, setActiveSession] = useState<ExcelUploadData | null>(null);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);

    // Queue status state for diagnostics UI
    const [queueStatus, setQueueStatus] = useState<{
        pending: number;
        failed: number;
        exhausted: number;
        circuitBreakerActive: boolean;
        cooldownRemainingMs: number | null;
    }>({ pending: 0, failed: 0, exhausted: 0, circuitBreakerActive: false, cooldownRemainingMs: null });

    const cancelledRef = useRef(false);
    const pausedRef = useRef(false);
    const sendingGateRef = useRef(false);
    const resumeResolverRef = useRef<(() => void) | null>(null);
    const sentRef = useRef(0);
    const failedRef = useRef(0);
    const queuedRef = useRef(0);
    const lastFlushRef = useRef(0);
    const lastFlushedCountRef = useRef(0);

    // Load persisted session on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Run cleanup for expired sessions first
                await cleanupExpiredSessions();

                // Check for active session
                const session = await uploadPersistence.loadCurrentUpload();
                if (session && mounted) {
                    setActiveSession(session);
                    setShowResumePrompt(true);
                    // Pre-populate excelRows for backward compatibility
                    const recipients = session.parsedData.map(contactRecordToRecipient);
                    setExcelRows(recipients);
                }

                const storedTemplate = await SecureStorage.getItem(STORAGE_KEYS.LAST_TEMPLATE);
                if (storedTemplate && mounted) setTemplate(storedTemplate);

                const recentsJson = await SecureStorage.getItem(STORAGE_KEYS.RECENTS);
                if (recentsJson && mounted) {
                    const parsed = JSON.parse(recentsJson);
                    if (Array.isArray(parsed)) setRecents(parsed.map((x) => String(x)));
                }

                // Only load excelRows from legacy storage if no active session
                if (!session) {
                    const excelRowsJson = await SecureStorage.getItem(STORAGE_KEYS.EXCEL_ROWS);
                    if (excelRowsJson && mounted) {
                        const parsed = JSON.parse(excelRowsJson);
                        if (Array.isArray(parsed)) setExcelRows(parsed);
                    }
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
            } finally {
                if (mounted) setSessionLoading(false);
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

    // Refresh queue status for UI diagnostics
    const refreshQueueStatus = useCallback(async () => {
        try {
            const stats = await getQueueStats();
            const circuitBreaker = getCircuitBreakerStatus();
            setQueueStatus({
                pending: stats.pending,
                failed: stats.failed,
                exhausted: stats.exhausted,
                circuitBreakerActive: circuitBreaker.isActive,
                cooldownRemainingMs: circuitBreaker.cooldownRemainingMs,
            });
        } catch (err) {
            console.warn('[BulkPro] Failed to refresh queue status:', err);
        }
    }, []);

    // Clear exhausted messages
    const clearExhausted = useCallback(async () => {
        try {
            await clearExhaustedMessages();
            await refreshQueueStatus();
        } catch (err) {
            console.warn('[BulkPro] Failed to clear exhausted:', err);
        }
    }, [refreshQueueStatus]);

    // Listen for delivery reports to update delivered count
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(
            "SmsDeliveredResult",
            (event: any) => {
                if (event?.id) {
                    setDelivered(prev => prev + 1);
                }
            }
        );

        return () => subscription.remove();
    }, []);

    // Periodic queue status refresh and auto-processing
    useEffect(() => {
        // Initial refresh
        refreshQueueStatus();

        // Refresh queue status every 10 seconds
        const statusInterval = setInterval(refreshQueueStatus, 10000);

        // Auto-process queue every 30 seconds when not actively sending
        const processInterval = setInterval(async () => {
            if (!sending) {
                await runQueueNow();
                await refreshQueueStatus();
            }
        }, 30000);

        return () => {
            clearInterval(statusInterval);
            clearInterval(processInterval);
        };
    }, [sending, refreshQueueStatus]);

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

            // P0: Enhanced processing with validation
            // Get raw data FIRST to ensure we have all custom columns for dynamic placeholders
            const rawData = await parseImportFile(path, name);
            const rawRows = rawData as unknown as ExcelRow[];

            // Validate that we have data
            if (!rawRows.length) {
                Alert.alert("Import Error", `File is empty or has no valid data rows.\n\nDetected format: ${fileTypeDisplayName}`);
                setImportLoading(false);
                return;
            }

            // For smart mapping detection, we can still use parseExcelSmart's logic OR rely on processContacts' auto-detect
            // Let's rely on processContacts since it covers the basics and we can map manually if needed.
            // But to preserve 'smart' aliasing from parseExcelSmart (e.g. 'Arrears Amount' -> 'amount'), 
            // we might want its mapping. However, let's stick to the raw data pipe for integrity.

            const processed = await processContacts(rawRows);

            // Sanity check: if processContacts found nothing valid, try falling back or alerting?
            // (It already separates valid/invalid).

            // Create session data
            const sessionData: ExcelUploadData = {
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
            await uploadPersistence.saveCurrentUpload(sessionData);
            setActiveSession(sessionData);

            // Legacy support: Convert to simple Recipients
            const recipients = processed.validContacts.map(contactRecordToRecipient);
            setExcelRows(recipients);

            // We already have rawData from above
            const actualHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];

            // Setup UI for mapping with actual file headers
            setHeaders(actualHeaders);
            setSampleRows(rawRows.slice(0, 10)); // Use first 10 rows for preview
            setAllRawRows(rawRows); // Store ALL rows for mapping confirmation

            // Mapping modal logic - detect amount candidates from actual headers
            const { amountCandidates: cands } = autoSuggestMapping(actualHeaders);
            setAmountCandidates(cands || []);

            // Show mapping modal with detected headers
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

    // Session Management Methods
    const handleSessionResume = () => {
        setShowResumePrompt(false);
        if (activeSession) {
            // Ensure data is loaded into operational state
            const recipients = activeSession.parsedData.map(contactRecordToRecipient);
            setExcelRows(recipients);
            setMode("excel");
        }
    };

    const handleSessionDiscard = async () => {
        try {
            await uploadPersistence.clearCurrentUpload();
            setActiveSession(null);
            setShowResumePrompt(false);
            setExcelRows([]);
            Alert.alert("Session Discarded", "Upload session has been cleared.");
        } catch (e) {
            console.error("Failed to discard session", e);
        }
    };

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

    /**
     * ⚡ Dynamic placeholder replacement - supports ANY Excel column as {column_name}
     * Built-in placeholders: {name}, {phone}, {amount}
     * Dynamic placeholders: {any_excel_header} from recipient.fields
     */
    function formatMessage(tpl: string, r: Recipient) {
        try {
            let result = tpl;

            // Built-in placeholders (backward compatible)
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

    async function handleSend(): Promise<{ success: boolean; blocked?: boolean; reason?: string } | undefined> {
        // Prevent multiple concurrent sends
        if (sendingGateRef.current) return;
        sendingGateRef.current = true;

        if (mergedRecipients.length === 0) {
            Alert.alert("Error", "No recipients to send to.");
            sendingGateRef.current = false;
            return { success: false };
        }

        // Generate unique bulkId for this campaign
        const bulkId = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        setCurrentBulkId(bulkId);
        console.log(`[BulkPro] Starting bulk send with bulkId: ${bulkId}, simSlot: ${simSlot}`);

        // ⚡ NEW: Create AbortController for proper cancellation
        const controller = new AbortController();
        const abortControllerRef = { current: controller };

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

        // ⚡ NEW: Timeout configuration with progressive backoff
        const timeoutConfig = {
            base: 10000,        // 10s base (reduced from 15s)
            retries: [15000, 20000, 25000], // Progressive backoff for retries
        };

        try {
            // ⚡ NEW: Async generator pattern instead of recursive setTimeout
            let index = 0;
            const totalRecipients = mergedRecipients.length;

            // For large batches (>1000), show streaming mode message
            if (totalRecipients > 1000) {
                console.log(`[BulkPro] Large batch detected (${totalRecipients}), using optimized streaming mode`);
            }

            // Process messages with async iteration
            for (const recipient of mergedRecipients) {
                // 1. Check Cancellation
                if (controller.signal.aborted || cancelledRef.current) {
                    console.log('[BulkPro] Send cancelled by user');
                    break;
                }

                // 2. Pause Logic
                if (pausedRef.current) {
                    await new Promise<void>((resolve) => {
                        resumeResolverRef.current = resolve;
                        if (controller.signal.aborted || cancelledRef.current) resolve();
                    });
                    // Re-check cancel after resume
                    if (controller.signal.aborted || cancelledRef.current) {
                        break;
                    }
                }

                // 3. Process Message with Write-Ahead Pattern
                const body = formatMessage(template, recipient);
                const phone = normalizePhone(recipient.phone);

                if (!phone) {
                    failedRef.current += 1;
                    index++;
                    continue;
                }

                let dbMessageId: number | null = null;
                try {
                    // P0 FIX: Check for duplicate sends (same message to same number within 5 minutes)
                    const isDuplicate = await isDuplicateSend(phone, body, 5 * 60 * 1000);
                    if (isDuplicate) {
                        console.log(`[BulkPro] Skipping duplicate: ${phone}`);
                        index++;
                        // Small delay before next iteration
                        await new Promise((r) => setTimeout(r, sendSpeed));
                        continue;
                    }

                    // ⚡ WRITE-AHEAD: Insert message to DB as 'pending' BEFORE sending
                    const conversation = await getOrCreateConversation(phone, recipient.name);
                    const dbMessage = await insertMessage(
                        conversation.id,
                        phone,
                        body,
                        'outgoing',
                        'pending'
                    );
                    dbMessageId = dbMessage.id;

                    // ⚡ NEW: Send with reduced timeout (10s) and AbortController
                    const sendPromise = sendSingleSms(phone, body, simSlot);
                    const timeoutPromise = new Promise<any>((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), timeoutConfig.base)
                    );

                    // Race with abort signal
                    const abortPromise = new Promise<any>((_, reject) => {
                        controller.signal.addEventListener('abort', () => reject(new Error("Aborted")));
                    });

                    const result = await Promise.race([sendPromise, timeoutPromise, abortPromise]);

                    if (result.success) {
                        sentRef.current += 1;
                        // Update DB status to 'sent'
                        await updateMessageStatus(dbMessageId, 'sent');
                    } else {
                        failedRef.current += 1;
                        // Update DB status to 'failed' and enqueue for retry
                        await updateMessageStatus(dbMessageId, 'failed');
                        await enqueueSMS(phone, body, simSlot, dbMessageId);
                        queuedRef.current += 1;
                    }

                    await saveSendLog({
                        phone,
                        status: result.success ? "SENT" : "FAILED",
                        at: new Date().toISOString(),
                        error: result.error ? String(result.error) : undefined
                    });
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);

                    // Don't count abort as failure
                    if (errMsg === "Aborted") {
                        break;
                    }

                    failedRef.current += 1;
                    // Update DB status if we have a message ID
                    if (dbMessageId) {
                        await updateMessageStatus(dbMessageId, 'failed').catch(() => { });
                    }
                    await enqueueSMS(phone, body, simSlot, dbMessageId || undefined);
                    queuedRef.current += 1;
                    console.warn(`[BulkPro] Send failed or timed out: ${phone}`, err);
                }

                index++;

                // Intelligent Flushing (every 20 messages or 1000ms for large batches)
                const now = Date.now();
                const totalProcessed = sentRef.current + failedRef.current;
                const diff = totalProcessed - lastFlushedCountRef.current;
                const timeDiff = now - lastFlushRef.current;
                const flushThreshold = totalRecipients > 1000 ? 1000 : 500; // Increased for large batches

                // Flush every 20 messages or based on time threshold
                if (diff >= 20 || timeDiff >= flushThreshold) {
                    setSent(sentRef.current);
                    setFailed(failedRef.current);
                    setQueued(queuedRef.current);
                    lastFlushRef.current = now;
                    lastFlushedCountRef.current = totalProcessed;
                }

                // Delay before next message to prevent carrier rate limiting
                await new Promise((r) => setTimeout(r, sendSpeed));
            }
        } catch (err) {
            console.error('[BulkPro] Unexpected error in send loop', err);
        } finally {
            // Final flush to ensure UI reflects final state
            setSent(sentRef.current);
            setFailed(failedRef.current);
            setQueued(queuedRef.current);

            setSending(false);
            sendingGateRef.current = false;

            console.log(`[BulkPro] Send complete. Sent: ${sentRef.current}, Failed: ${failedRef.current}, Queued: ${queuedRef.current}`);
            return { success: true };
        }
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
        headers, sampleRows, allRawRows, amountCandidates, showMappingModal, setShowMappingModal,
        contacts, contactsLoading, selectedIds, setSelectedIds, query, setQuery,
        mergedRecipients,
        sending, sent, failed, queued, delivered, paused, sendSpeed, setSendSpeed,
        simSlot, setSimSlot,
        currentBulkId,
        handleSend, togglePause, stopSending,
        smsStatus,
        runQueueNow,
        formatMessage,
        normalizePhone,
        // Session exports
        activeSession,
        showResumePrompt,
        handleSessionResume,
        handleSessionDiscard,
        sessionLoading,
        // Queue status exports for UI diagnostics
        queueStatus,
        refreshQueueStatus,
        clearExhausted,
    };
}