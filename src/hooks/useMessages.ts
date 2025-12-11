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
        // We'll trust that type matches the enum. In real world, we'd validate.
        await addMessage(
          evt.from ?? "Unknown",
          evt.body ?? "",
          (evt.type ?? "incoming") as any,
          "sent",
          Date.now(),
          null, // threadId not available in simple event
          evt.simSlot ? Number(evt.simSlot) : null // database expects number for simSlot
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
      simSlot: number | null = null
    ) => {
      const id = await addMessage(
        addr,
        body,
        "outgoing",
        "pending",
        Date.now(),
        null, // threadId is optional
        simSlot
      );
      return id;
    },

    // Update message status
    markSent: (id: number) => updateMessageStatus(id, "sent"),
    markDelivered: (id: number) => updateMessageStatus(id, "delivered"),
    markFailed: (id: number) => updateMessageStatus(id, "failed"),
  };
}