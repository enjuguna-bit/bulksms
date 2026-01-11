import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as Keychain from "react-native-keychain";
import { SecureStorageService } from "@/services/SecureStorageService";

const LOCK_TIMEOUT = 1000 * 60; // 1 minute background timeout
const STORAGE_KEY_ENABLED = "app_lock_enabled";
const KEYCHAIN_SERVICE = "app_lock_auth";

export function useAppLock() {
    const [isLocked, setIsLocked] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [biometryType, setBiometryType] = useState<Keychain.BIOMETRY_TYPE | undefined>();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const appState = useRef(AppState.currentState);
    const backgroundTime = useRef<number | null>(null);

    // 1. Check Support & Load State
    useEffect(() => {
        let mounted = true;

        // 🛡️ Safety Timeout: Force ready if storage/native hangs
        const safetyTimeout = setTimeout(() => {
            if (mounted) {
                console.warn("[AppLock] Init timed out, forcing ready state");
                setIsReady(true);
            }
        }, 2000);

        (async () => {
            try {
                // Check Hardware
                const type = await Keychain.getSupportedBiometryType();
                if (mounted) {
                    setIsSupported(!!type);
                    setBiometryType(type || undefined);
                }

                // Check stored preference
                const enabledStr = await SecureStorageService.getItem(STORAGE_KEY_ENABLED);
                const enabled = enabledStr === "true";
                if (mounted) setIsEnabled(enabled);

                // Initial Lock State
                if (enabled) {
                    setIsLocked(true);
                }
            } catch (e) {
                console.warn("[AppLock] Init failed", e);
            } finally {
                if (mounted) setIsReady(true);
                clearTimeout(safetyTimeout);
            }
        })();

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
        };
    }, []);

    // 2. Handle App State (Auto-Lock)
    useEffect(() => {
        const subscription = AppState.addEventListener("change", nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === "active"
            ) {
                // Coming to foreground
                if (isEnabled && backgroundTime.current) {
                    const elapsed = Date.now() - backgroundTime.current;
                    if (elapsed > LOCK_TIMEOUT) {
                        setIsLocked(true);
                    }
                }
                backgroundTime.current = null;
            } else if (nextAppState.match(/inactive|background/)) {
                // Going to background
                backgroundTime.current = Date.now();
            }

            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [isEnabled]);

    // 3. Toggle Lock (Requires Auth to Enable)
    const setLockEnabled = useCallback(async (enable: boolean) => {
        if (enable) {
            // Must authenticate to enable
            try {
                // Check if we can create a protected item
                await Keychain.setGenericPassword("lock_check", "enabled", {
                    service: KEYCHAIN_SERVICE,
                    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
                    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
                });

                await SecureStorageService.setItem(STORAGE_KEY_ENABLED, "true");
                setIsEnabled(true);
                return true;
            } catch (error) {
                console.warn("[AppLock] Failed to enable", error);
                return false;
            }
        } else {
            // Disable
            await SecureStorageService.setItem(STORAGE_KEY_ENABLED, "false");
            setIsEnabled(false);
            setIsLocked(false);
            return true;
        }
    }, []);

    // 4. Unlock Function
    const unlock = useCallback(async () => {
        if (!isEnabled) {
            setIsLocked(false);
            return true;
        }

        try {
            // In a real scenario, we might verify a signed token.
            // Here we just use the presence of the biometric prompt to verify user.
            // We read the dummy item we set when enabling.
            const result = await Keychain.getGenericPassword({
                service: KEYCHAIN_SERVICE,
                authenticationPrompt: {
                    title: "Unlock App",
                    subtitle: "Authenticate to access messages",
                    description: "Verify your identity",
                    cancel: "Cancel",
                },
            });

            if (result) {
                setIsLocked(false);
                return true;
            }
            return false;
        } catch (error) {
            console.log("[AppLock] Auth failed/cancelled", error);
            return false;
        }
    }, [isEnabled]);

    return {
        isLocked,
        unlock,
        isSupported,
        biometryType,
        isEnabled,
        setLockEnabled,
        isReady,
    };
}
