import { useState, useEffect } from "react";
import SecureStorage from "@/utils/SecureStorage";
import { canSendSms } from "@/services/smsService";

const STORAGE_KEYS = {
    LAST_TEMPLATE: "bulkPro:lastMessageTemplate",
    RECENTS: "bulkPro:recentTemplates",
};

/**
 * Hook for managing SMS sending status and message templates
 * Handles SMS capability checking and template persistence
 */
export function useSmsStatusAndTemplates() {
    const [template, setTemplate] = useState("Hello {name}, your arrears are KES {amount}. Pay via Paybill 247777.");
    const [recents, setRecents] = useState<string[]>([]);
    const [smsStatus, setSmsStatus] = useState<"checking" | "ok" | "fail" | "unknown">("checking");

    // Load persisted data on mount
    useEffect(() => {
        const loadPersistedData = async () => {
            try {
                const [storedTemplate, recentsJson] = await Promise.all([
                    SecureStorage.getItem(STORAGE_KEYS.LAST_TEMPLATE),
                    SecureStorage.getItem(STORAGE_KEYS.RECENTS),
                ]);

                if (storedTemplate) setTemplate(storedTemplate);

                if (recentsJson) {
                    const parsed = JSON.parse(recentsJson);
                    if (Array.isArray(parsed)) {
                        setRecents(parsed.map((x) => String(x)));
                    }
                }

                // Check SMS capability
                const ok = await canSendSms();
                setSmsStatus(ok ? "ok" : "fail");
            } catch (e) {
                console.warn("SmsStatusAndTemplates: init error", e);
                setSmsStatus("unknown");
            }
        };

        loadPersistedData();
    }, []);

    const saveTemplate = async () => {
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
        }
    };

    const clearRecents = () => {
        setRecents([]);
        SecureStorage.removeItem(STORAGE_KEYS.RECENTS).catch((e) =>
            console.warn("Failed to clear recents:", e)
        );
    };

    return {
        template,
        setTemplate,
        recents,
        smsStatus,
        saveTemplate,
        clearRecents,
    };
}
