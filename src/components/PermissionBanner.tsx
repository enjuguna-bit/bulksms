import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  AppState,
  ActivityIndicator,
  AppStateStatus,
} from "react-native";
import {
  checkSmsPermissions,
  requestSmsPermissions,
} from "@/services/permissions";

export default function PermissionBanner() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Check on mount
  useEffect(() => {
    (async () => {
      try {
        setGranted(await checkSmsPermissions());
      } catch (e) {
        console.warn("[PermissionBanner] Initial check failed:", e);
      }
    })();
  }, []);

  // 🔄 Recheck when app comes back from Settings
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      async (state: AppStateStatus) => {
        if (state === "active") {
          try {
            setGranted(await checkSmsPermissions());
          } catch (e) {
            console.warn("[PermissionBanner] Foreground check failed:", e);
          }
        }
      }
    );
    return () => sub.remove();
  }, []);

  const handleGrant = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await requestSmsPermissions();
      setGranted(ok);
    } catch (e) {
      console.warn("[PermissionBanner] Request error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (granted) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissions needed</Text>
      <Text style={styles.message}>
        SMS and Contacts permissions are required for offline sending and inbox scanning.
      </Text>

      <TouchableOpacity
        onPress={handleGrant}
        style={styles.button}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.buttonText}>Grant permissions</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openSettings()}
        style={[styles.button, { marginTop: 8 }]}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    margin: 12,
    borderRadius: 12,
    backgroundColor: "#fef3c7",
  },
  title: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#92400e",
  },
  message: {
    marginBottom: 10,
    color: "#78350f",
  },
  button: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#fcd34d",
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
});
