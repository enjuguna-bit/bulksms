// ---------------------------------------------------------
// 📡 src/hooks/useMessages.ts
// Hook over SQLite message DB to keep screens simple
// ---------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import {
  addMessage,
  getAllMessages,
  getMessagesByAddress,
  updateMessageStatus,
  MessageRow,
} from "@/db/database";

export function useMessages(address?: string) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 🧭 Load all messages or those for a specific address
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = address
        ? await getMessagesByAddress(address)
        : await getAllMessages();
      setMessages(rows);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Initial load
  useEffect(() => {
    reload();
  }, [reload]);

  // 📨 Listen for incoming messages from native bridge
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "onIncomingSms",
      async (evt: any) => {
        if (!evt) return;
        await addMessage(
          evt.from ?? "Unknown",
          evt.body ?? "",
          (evt.type ?? "incoming") as any,
          "sent",
          Date.now(),
          evt.simSlot ? String(evt.simSlot) : null // ✅ cast simSlot to string|null
        );
        await reload();
      }
    );
    return () => sub.remove();
  }, [reload]);

  // 📡 Listen for sent & delivered status updates from native layer
  useEffect(() => {
    const s1 = DeviceEventEmitter.addListener(
      "SmsSentResult",
      async (e: any) => {
        if (e?.id && e?.status) {
          await updateMessageStatus(Number(e.id), e.status);
          await reload();
        }
      }
    );

    const s2 = DeviceEventEmitter.addListener(
      "SmsDeliveredResult",
      async (e: any) => {
        if (e?.id) {
          await updateMessageStatus(Number(e.id), "delivered");
          await reload();
        }
      }
    );

    return () => {
      s1.remove();
      s2.remove();
    };
  }, [reload]);

  // ✍️ Public API to screens
  return {
    messages,
    loading,
    reload,

    // Add a new outgoing message and return the inserted ID
    addOutgoing: async (
      addr: string,
      body: string,
      simSlot: string | null = null // ✅ changed type from number|null to string|null
    ) => {
      const id = await addMessage(
        addr,
        body,
        "outgoing",
        "pending",
        Date.now(),
        simSlot ? String(simSlot) : null
      );
      return id;
    },

    // Update message status
    markSent: (id: number) => updateMessageStatus(id, "sent"),
    markDelivered: (id: number) => updateMessageStatus(id, "delivered"),
    markFailed: (id: number) => updateMessageStatus(id, "failed"),
  };
}