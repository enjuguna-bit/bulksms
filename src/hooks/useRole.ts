import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { smsRole } from "@/native";

export function useRole() {
    const [isDefault, setIsDefault] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkRole = useCallback(async () => {
        if (Platform.OS !== "android") {
            setIsDefault(true);
            setLoading(false);
            return;
        }

        try {
            const status = await smsRole.isDefault();
            setIsDefault(status);
        } catch (e) {
            console.warn("[useRole] Check failed:", e);
            // Fail safe to true in dev if something breaks, but false in prod
            setIsDefault(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const requestRole = useCallback(async () => {
        if (Platform.OS !== "android") return;

        setLoading(true);
        try {
            await smsRole.requestDefault();
            // We don't await the result because the system dialog takes over.
            // We rely on AppState change to recheck.
        } catch (e) {
            console.warn("[useRole] Request failed:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check on mount
    useEffect(() => {
        checkRole();
    }, [checkRole]);

    // Recheck on foreground
    useEffect(() => {
        const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
            if (state === "active") {
                checkRole();
            }
        });
        return () => sub.remove();
    }, [checkRole]);

    return {
        isDefault,
        loading,
        checkRole,
        requestRole,
    };
}
