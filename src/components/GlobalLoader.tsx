// src/components/GlobalLoader.tsx
import React from "react";
import { View, ActivityIndicator, Text, StyleSheet, Modal } from "react-native";

type Props = {
  visible?: boolean;
  message?: string;
};

export default function GlobalLoader({ visible = true, message = "Loading..." }: Props) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
});
