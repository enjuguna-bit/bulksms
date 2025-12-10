import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
// import ReactNativeBiometrics, { BiometryType } from "react-native-biometrics";
// Mock BiometryType for type safety
type BiometryType = 'TouchID' | 'FaceID' | 'Biometrics';
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCK_TIMEOUT = 1000 * 60; // 1 minute background timeout
const STORAGE_KEY_LAST_ACTIVE = "app_lock_last_active";
const STORAGE_KEY_ENABLED = "app_lock_enabled";

export function useAppLock() {
    const [isLocked, setIsLocked] = useState(false);
    const [isSupported, setIsSupported] = useState(false); // Biometrics removed
    const [biometryType, setBiometryType] = useState<BiometryType | undefined>();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isReady, setIsReady] = useState(true);

    // Mock implementation - always unlocked for now to ensure stability
    const unlock = useCallback(async () => {
        setIsLocked(false);
        return true;
    }, []);

    const setLockEnabled = useCallback(async (enabled: boolean) => {
        setIsEnabled(enabled);
    }, []);

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
