import { useState, useEffect } from "react";
import uploadPersistence from "@/services/uploadPersistence";
import { cleanupExpiredSessions } from "@/services/sessionCleanup";
import { contactRecordToRecipient } from "@/services/excelProcessor";
import type { ExcelUploadData, ContactRecord } from "@/types/bulkSms";

/**
 * Hook for managing bulk SMS session persistence and recovery
 * Handles loading, saving, and cleanup of upload sessions
 */
export function useBulkSmsSession(setExcelRows: (rows: any[]) => void) {
    const [activeSession, setActiveSession] = useState<ExcelUploadData | null>(null);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);

    // Load session on mount
    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            try {
                // Clean up expired sessions first
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
            } catch (e) {
                console.warn("BulkSmsSession: Failed to load session", e);
            } finally {
                if (mounted) {
                    setSessionLoading(false);
                }
            }
        };

        loadSession();
        return () => { mounted = false; };
    }, [setExcelRows]);

    const handleSessionResume = () => {
        setShowResumePrompt(false);
        if (activeSession) {
            // Ensure data is loaded into operational state
            const recipients = activeSession.parsedData.map(contactRecordToRecipient);
            setExcelRows(recipients);
        }
    };

    const handleSessionDiscard = async () => {
        try {
            await uploadPersistence.clearCurrentUpload();
            setActiveSession(null);
            setShowResumePrompt(false);
            setExcelRows([]);
        } catch (e) {
            console.error("Failed to discard session", e);
        }
    };

    const saveSession = async (sessionData: ExcelUploadData) => {
        try {
            await uploadPersistence.saveCurrentUpload(sessionData);
            setActiveSession(sessionData);
        } catch (e) {
            console.warn("BulkSmsSession: Failed to save session", e);
        }
    };

    return {
        activeSession,
        showResumePrompt,
        sessionLoading,
        handleSessionResume,
        handleSessionDiscard,
        saveSession,
    };
}
