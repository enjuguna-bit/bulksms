// ==========================================================
// src/hooks/useNativeSms.ts
// High-level hook over src/native/index.ts
// ----------------------------------------------------------
// Exposes:
//  - inbox, mpesaMessages
//  - loading flags
//  - isDefaultSmsApp, devBypassEnabled
//  - sendNativeSms(), refreshInbox(), refreshMpesa()
//  - subscribe automatically to onSmsReceived events
// ==========================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import {
  smsReader,
  smsSender,
  smsRole,
  devBypass,
  smsListener,
  type SmsMessageRecord,
  type MpesaMessageRecord,
  type IncomingSmsEventPayload,
} from "@/native";

type UseNativeSmsOptions = {
  autoLoadInbox?: boolean;
  autoLoadMpesa?: boolean;
  autoSubscribeIncoming?: boolean;
  mpesaLimit?: number;
  inboxLimit?: number; // reserved for future native implementation
};

export type NativeSmsSendResult = {
  success: number;
  failed: number;
};

export function useNativeSms(options: UseNativeSmsOptions = {}) {
  const {
    autoLoadInbox = true,
    autoLoadMpesa = false,
    autoSubscribeIncoming = true,
    mpesaLimit = 300,
  } = options;

  const isAndroid = Platform.OS === "android";

  const [inbox, setInbox] = useState<SmsMessageRecord[]>([]);
  const [mpesaMessages, setMpesaMessages] = useState<MpesaMessageRecord[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [mpesaLoading, setMpesaLoading] = useState(false);

  const [isDefaultSms, setIsDefaultSms] = useState(false);
  const [devBypassEnabled, setDevBypassEnabled] = useState(false);

  const [simCount, setSimCount] = useState<number>(1);
  const [canSendNative, setCanSendNative] = useState(false);

  // ----------------------------------------------------------
  // Load base capabilities (role + dev bypass + sim count)
  // ----------------------------------------------------------
  useEffect(() => {
    if (!isAndroid) return;

    let cancelled = false;

    (async () => {
      try {
        const [def, bypass, sims, canSend] = await Promise.all([
          smsRole.isDefault(),
          devBypass.isEnabled(),
          smsSender.getSimCount(),
          smsSender.canSend(),
        ]);

        if (cancelled) return;

        setIsDefaultSms(def);
        setDevBypassEnabled(bypass);
        setSimCount(sims);
        setCanSendNative(canSend);
      } catch (err) {
        if (!cancelled) {
          console.warn("[useNativeSms] init error:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAndroid]);

  // ----------------------------------------------------------
  // Inbox loaders
  // ----------------------------------------------------------
  const [inboxLimit, setInboxLimit] = useState(options.inboxLimit ?? 50);

  // ----------------------------------------------------------
  // Inbox loaders
  // ----------------------------------------------------------
  const refreshInbox = useCallback(async () => {
    if (!isAndroid) return;

    setInboxLoading(true);
    try {
      // Fetch with limit (default 50, increases on loadMore)
      const list = await smsReader.getAll(inboxLimit);
      setInbox(list);
    } finally {
      setInboxLoading(false);
    }
  }, [isAndroid, inboxLimit]);

  const loadMoreInbox = useCallback(() => {
    setInboxLimit((prev) => prev + 50);
  }, []);

  // Trigger refresh when limit changes
  useEffect(() => {
    if (autoLoadInbox) refreshInbox();
  }, [inboxLimit, refreshInbox, autoLoadInbox]);

  const refreshMpesa = useCallback(
    async (limit: number = mpesaLimit) => {
      if (!isAndroid) return;

      setMpesaLoading(true);
      try {
        const list = await smsReader.getMpesaMessages(limit);
        setMpesaMessages(list);
      } finally {
        setMpesaLoading(false);
      }
    },
    [isAndroid, mpesaLimit]
  );

  // Auto-load on mount (handled by limit effect above for inbox)
  useEffect(() => {
    if (!isAndroid) return;
    if (autoLoadMpesa) void refreshMpesa();
  }, [isAndroid, autoLoadMpesa, refreshMpesa]);

  // ----------------------------------------------------------
  // Incoming SMS subscription
  // ----------------------------------------------------------
  useEffect(() => {
    if (!isAndroid || !autoSubscribeIncoming) return;

    const sub = smsListener.addListener((payload: IncomingSmsEventPayload) => {
      setInbox((prev) => [
        {
          id: `${payload.timestamp}-${payload.phone}`,
          address: payload.phone,
          body: payload.body,
          timestamp: payload.timestamp,
          type: "incoming",
        },
        ...prev,
      ]);
    });

    return () => {
      sub.remove();
    };
  }, [isAndroid, autoSubscribeIncoming]);

  // ----------------------------------------------------------
  // Native send helpers (single + bulk)
  // ----------------------------------------------------------
  const sendNativeSms = useCallback(
    async (phone: string, body: string): Promise<boolean> => {
      if (!isAndroid) return false;
      if (!phone || !body) return false;

      return await smsSender.send(phone, body);
    },
    [isAndroid]
  );

  const sendNativeBulk = useCallback(
    async (items: { phone: string; body: string }[]): Promise<NativeSmsSendResult> => {
      if (!isAndroid || !items.length) {
        return { success: 0, failed: 0 };
      }

      let success = 0;
      let failed = 0;

      for (const item of items) {

        const ok = await smsSender.send(item.phone, item.body);
        if (ok) success += 1;
        else failed += 1;
      }

      return { success, failed };
    },
    [isAndroid]
  );

  // ----------------------------------------------------------
  // Derived values
  // ----------------------------------------------------------
  const summary = useMemo(
    () => ({
      totalInbox: inbox.length,
      totalMpesa: mpesaMessages.length,
      isAndroid,
      simCount,
      canSendNative,
      isDefaultSms,
      devBypassEnabled,
    }),
    [
      inbox.length,
      mpesaMessages.length,
      isAndroid,
      simCount,
      canSendNative,
      isDefaultSms,
      devBypassEnabled,
    ]
  );

  return {
    // platform info
    isAndroid,

    // role / dev flags
    isDefaultSms,
    devBypassEnabled,

    // sending capabilities
    simCount,
    canSendNative,
    sendNativeSms,
    sendNativeBulk,

    // inbox / mpesa
    inbox,
    mpesaMessages,
    inboxLoading,
    mpesaLoading,
    refreshInbox,
    loadMoreInbox,
    refreshMpesa,

    // summary for dashboards
    summary,
  };
}
