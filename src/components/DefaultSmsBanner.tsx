// -------------------------------------------------------------------
// 📢 DefaultSmsBanner.tsx — Banner when app isn't default SMS handler
// -------------------------------------------------------------------
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  ActivityIndicator,
} from "react-native";
import { isDefaultSmsApp, requestDefaultSmsApp } from "@/native/smsRole";

export default function DefaultSmsBanner() {
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(false);

  // ✅ Safe check wrapper
  const safeCheck = async () => {
    try {
      // 🚀 Dev or missing module bypass happens inside isDefaultSmsApp()
      const status = await isDefaultSmsApp();
      setIsDefault(status);
    } catch (e) {
      console.warn("[DefaultSmsBanner] Check failed:", e);
      setIsDefault(true); // prevent blocking in dev mode
    }
  };

  // ✅ Check status on mount
  useEffect(() => {
    safeCheck();
  }, []);

  // 🧠 Recheck when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        safeCheck();
      }
    });

    return () => sub.remove();
  }, []);

  // 📲 Handle prompt
  const handlePrompt = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await requestDefaultSmsApp();
      setTimeout(async () => {
        safeCheck();
        setLoading(false);
      }, 1000);
    } catch (e) {
      console.warn("[DefaultSmsBanner] Prompt error:", e);
      setLoading(false);
    }
  };

  if (isDefault) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Not set as default SMS app</Text>
      <TouchableOpacity
        onPress={handlePrompt}
        disabled={loading}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <Text style={styles.link}>Set Now</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#fef3c7",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#fcd34d",
  },
  text: {
    color: "#92400e",
    fontWeight: "500",
  },
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  link: {
    color: "#2563eb",
    fontWeight: "600",
  },
});
