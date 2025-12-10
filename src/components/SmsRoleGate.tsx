
// -----------------------------------------------------
// src/components/SmsRoleGate.tsx
// ✅ Safe dev bypass for Expo LAN and bridgeless mode
// -----------------------------------------------------

import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, AppState, StyleSheet } from "react-native";
import { smsRole } from "@/native";

export default function SmsRoleGate({ children }: { children: React.ReactNode }) {
  const [isDefault, setIsDefault] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequest = useRef(false);

  const checkRole = useCallback(async () => {
    console.log("[SmsRoleGate] Checking SMS role...");
    try {
      const result = await smsRole.isDefault();
      console.log("[SmsRoleGate] isDefault result:", result);
      setIsDefault(result);
      if (result) {
        setError(null);
      }
    } catch (e: any) {
      console.warn("[SmsRoleGate] Error checking SMS role", e);
      // In dev mode or on error, don't block the app
      setIsDefault(true);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkRole();
  }, [checkRole]);

  // Re-check when app comes to foreground (user may have granted role in system dialog)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      console.log("[SmsRoleGate] AppState changed to:", nextState);
      if (nextState === "active" && pendingRequest.current) {
        pendingRequest.current = false;
        // Delay check to ensure system has updated the role
        setTimeout(() => {
          checkRole();
          setChecking(false);
        }, 300);
      }
    });

    return () => subscription.remove();
  }, [checkRole]);

  const requestRole = async () => {
    console.log("[SmsRoleGate] Requesting default SMS role...");
    setChecking(true);
    setError(null);
    pendingRequest.current = true;
    
    try {
      const granted = await smsRole.requestDefault();
      console.log("[SmsRoleGate] requestDefault result:", granted);
      
      // If the native module returns true, the role was granted
      if (granted) {
        setIsDefault(true);
        setChecking(false);
        pendingRequest.current = false;
      }
      // If false, the dialog was shown - wait for AppState change
    } catch (e: any) {
      console.warn("[SmsRoleGate] Request role error:", e?.message || e);
      pendingRequest.current = false;
      
      // Check if user cancelled
      if (e?.code === "USER_CANCELLED" || e?.message?.includes("declined")) {
        setError("You need to set this app as default SMS to continue.");
      } else {
        setError(e?.message || "Failed to request SMS role");
      }
      
      // Re-check the role status anyway
      await checkRole();
      setChecking(false);
    }
  };

  if (isDefault === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Checking SMS permissions...</Text>
      </View>
    );
  }

  if (!isDefault) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          This app must be set as the default SMS app to continue.
        </Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        <TouchableOpacity 
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={requestRole} 
          disabled={checking}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {checking ? "Opening Settings..." : "Set as Default SMS App"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>
          Tap the button above, then select this app in the system dialog.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#1a1a2e",
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    color: "#ffffff",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    color: "#ff6b6b",
  },
  hintText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
    color: "#9db0d3",
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: "#6b7280",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
