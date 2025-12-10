import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

interface AdminUnlockModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminUnlockModal({ visible, onClose }: AdminUnlockModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 8,
            width: "80%",
          }}
        >
          <Text style={{ fontSize: 16, marginBottom: 16 }}>Enter admin code</Text>
          {/* Your input field or unlock logic can go here */}

          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: "#007AFF",
              padding: 10,
              borderRadius: 6,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
