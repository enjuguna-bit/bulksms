// ==========================================================
// src/native/index.ts
// Central wrappers around all native SMS-related modules
// ----------------------------------------------------------
// Exposes:
//  - smsReader         → inbox / threads / M-PESA messages
//  - smsSender         → native SEND_SMS bridge
//  - smsListener       → onSmsReceived event emitter
//  - smsRole           → default SMS role helpers
//  - devBypass         → Dev bypass flags from BuildConfig
// ----------------------------------------------------------
// All functions are Android-safe and fail-soft on iOS.
// ==========================================================

import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  EmitterSubscription,
  NativeModule,
} from "react-native";

// -------------------------------------------------------------------
// Types from native side (Kotlin modules you pasted)
// -------------------------------------------------------------------

export type SmsDirection = "incoming" | "outgoing";

export type SmsMessageRecord = {
  id: string;
  address: string;
  body: string;
  timestamp: number;
  type: SmsDirection;
};

export type MpesaMessageRecord = {
  id?: string; // not explicitly returned in Kotlin parse, but keep optional
  address?: string;
  body?: string;
  timestamp?: number;
  type?: SmsDirection;

  transactionCode?: string;
  amount?: string;
  payer?: string;
  phoneNumber?: string;
  reference?: string;
  messageType?: string;
};

export type IncomingSmsEventPayload = {
  phone: string;
  body: string;
  timestamp: number;
};

// -------------------------------------------------------------------
// Native module typings
// -------------------------------------------------------------------

type NativeSmsReaderModule = {
  getAll(limit: number): Promise<SmsMessageRecord[]>;
  getThreadByAddress(address: string, limit: number): Promise<SmsMessageRecord[]>;
  getMpesaMessages(limit: number): Promise<MpesaMessageRecord[]>;
  getMessageCount(): Promise<number>;
  importExistingMessages(): Promise<SmsMessageRecord[]>;
};

type NativeSmsSenderModule = {
  sendSms(phoneNumber: string, message: string, simSlot: number): Promise<{ success: boolean; id: number }>;
  getSimCount(): Promise<number>;
  canSendSms(): Promise<boolean>;
};

type NativeSmsListenerModule = {
  // Only used as an event source by NativeEventEmitter
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
};

type NativeRoleHelperModule = {
  isDefaultSmsApp(): Promise<boolean>;
  openSmsRoleIntent(): void;
  requestDefaultSmsRole(): Promise<boolean>;
};

type NativeDefaultSmsRoleModule = {
  isDefaultSmsApp(): Promise<boolean>;
  requestDefaultSmsApp(): Promise<boolean>;
};

type NativeDevBypassBridgeModule = {
  isDevBypassEnabled(): Promise<boolean>;
  getBypassInfo(): Promise<{ enabled: boolean }>;
  enable(): void;
  disable(): void;
};

// -------------------------------------------------------------------
// Safe module access helpers
// -------------------------------------------------------------------

const {
  SmsReaderModule,
  SmsSenderModule,
  SmsListenerModule,
  RoleHelperModule,
  DefaultSmsRoleModule,
  DevBypassBridgeModule,
} = NativeModules as {
  SmsReaderModule?: NativeSmsReaderModule;
  SmsSenderModule?: NativeSmsSenderModule;
  SmsListenerModule?: NativeSmsListenerModule;
  RoleHelperModule?: NativeRoleHelperModule;
  DefaultSmsRoleModule?: NativeDefaultSmsRoleModule;
  DevBypassBridgeModule?: NativeDevBypassBridgeModule;
};

// -------------------------------------------------------------------
// smsReader wrapper
// -------------------------------------------------------------------

export const smsReader = {
  /**
   * Read all SMS messages (inbox + sent), sorted by date desc.
   */
  async getAll(limit: number = 100): Promise<SmsMessageRecord[]> {
    if (Platform.OS !== "android" || !SmsReaderModule) return [];
    try {
      const res = await SmsReaderModule.getAll(limit);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn("[smsReader.getAll] error:", err);
      return [];
    }
  },

  /**
   * Read messages for a specific address (phone number).
   */
  async getThreadByAddress(
    address: string,
    limit: number = 200
  ): Promise<SmsMessageRecord[]> {
    if (Platform.OS !== "android" || !SmsReaderModule) return [];
    if (!address) return [];
    try {
      const res = await SmsReaderModule.getThreadByAddress(address, limit);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn("[smsReader.getThreadByAddress] error:", err);
      return [];
    }
  },

  /**
   * Read M-PESA-like messages only (native parser does the filtering).
   */
  async getMpesaMessages(limit: number = 300): Promise<MpesaMessageRecord[]> {
    if (Platform.OS !== "android" || !SmsReaderModule) return [];
    try {
      const res = await SmsReaderModule.getMpesaMessages(limit);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn("[smsReader.getMpesaMessages] error:", err);
      return [];
    }
  },

  /**
   * Get total count of messages in device SMS content provider.
   */
  async getMessageCount(): Promise<number> {
    if (Platform.OS !== "android" || !SmsReaderModule) return 0;
    try {
      const count = await SmsReaderModule.getMessageCount();
      return typeof count === "number" ? count : 0;
    } catch (err) {
      console.warn("[smsReader.getMessageCount] error:", err);
      return 0;
    }
  },

  /**
   * Import all existing messages from device SMS content provider.
   * Used for initial sync when app is first installed.
   */
  async importExistingMessages(): Promise<SmsMessageRecord[]> {
    if (Platform.OS !== "android" || !SmsReaderModule) return [];
    try {
      const messages = await SmsReaderModule.importExistingMessages();
      return Array.isArray(messages) ? messages : [];
    } catch (err) {
      console.warn("[smsReader.importExistingMessages] error:", err);
      return [];
    }
  },
};

// -------------------------------------------------------------------
// smsSender wrapper (native SEND_SMS via SmsManager)
// -------------------------------------------------------------------

export const smsSender = {
  /**
   * Sends a single SMS using the native SmsManager bridge.
   * Requires:
   *  - SEND_SMS permission
   *  - App as default SMS handler on Android 4.4+
   */
  async send(phone: string, body: string, simSlot: number = 0): Promise<boolean> {
    if (Platform.OS !== "android" || !SmsSenderModule) return false;
    if (!phone || !body) return false;
    try {
      const result = await SmsSenderModule.sendSms(phone, body, simSlot);
      if (!result.success) {
        console.warn(`[smsSender.send] Failed to send to ${phone}: Native returned false`);
      }
      return result.success;
    } catch (err) {
      console.warn("[smsSender.send] error:", err);
      return false;
    }
  },

  async canSend(): Promise<boolean> {
    if (Platform.OS !== "android" || !SmsSenderModule) return false;
    try {
      const ok = await SmsSenderModule.canSendSms();
      return !!ok;
    } catch (err) {
      console.warn("[smsSender.canSend] error:", err);
      return false;
    }
  },

  async getSimCount(): Promise<number> {
    if (Platform.OS !== "android" || !SmsSenderModule) return 1;
    try {
      const n = await SmsSenderModule.getSimCount();
      return typeof n === "number" && n > 0 ? n : 1;
    } catch (err) {
      console.warn("[smsSender.getSimCount] error:", err);
      return 1;
    }
  },
};

// -------------------------------------------------------------------
// smsListener wrapper (onSmsReceived events)
// -------------------------------------------------------------------

const smsEventsEmitter = (() => {
  if (Platform.OS !== "android" || !SmsListenerModule) return null;
  return new NativeEventEmitter(SmsListenerModule as NativeModule);
})();

/**
 * Subscribe to "onSmsReceived" events emitted from SmsListenerModule.
 */
export function addSmsReceivedListener(
  handler: (payload: IncomingSmsEventPayload) => void
): EmitterSubscription | { remove: () => void } {
  if (!smsEventsEmitter) {
    return { remove: () => { } };
  }
  const sub = smsEventsEmitter.addListener("onSmsReceived", handler);
  return sub;
}

export const smsListener = {
  addListener: addSmsReceivedListener,
};

// -------------------------------------------------------------------
// smsRole wrapper (default SMS app role & settings)
// Uses both RoleHelperModule + DefaultSmsRoleModule if available
// -------------------------------------------------------------------

export const smsRole = {
  /**
   * Check if current app is the default SMS app.
   */
  async isDefault(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    try {
      if (DefaultSmsRoleModule?.isDefaultSmsApp) {
        return !!(await DefaultSmsRoleModule.isDefaultSmsApp());
      }
      if (RoleHelperModule?.isDefaultSmsApp) {
        return !!(await RoleHelperModule.isDefaultSmsApp());
      }
    } catch (err) {
      console.warn("[smsRole.isDefault] error:", err);
    }

    return false;
  },

  /**
   * Request to become the default SMS app.
   * Returns TRUE if the request was successfully launched or already default.
   */
  async requestDefault(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    try {
      if (DefaultSmsRoleModule?.requestDefaultSmsApp) {
        return !!(await DefaultSmsRoleModule.requestDefaultSmsApp());
      }
      if (RoleHelperModule?.requestDefaultSmsRole) {
        return !!(await RoleHelperModule.requestDefaultSmsRole());
      }
      // Fallback: open system role settings without result
      if (RoleHelperModule?.openSmsRoleIntent) {
        RoleHelperModule.openSmsRoleIntent();
        return true;
      }
    } catch (err) {
      console.warn("[smsRole.requestDefault] error:", err);
    }

    return false;
  },
};

// -------------------------------------------------------------------
// devBypass wrapper
// -------------------------------------------------------------------

export const devBypass = {
  async isEnabled(): Promise<boolean> {
    if (Platform.OS !== "android" || !DevBypassBridgeModule) return false;
    try {
      const res = await DevBypassBridgeModule.isDevBypassEnabled();
      return !!res;
    } catch (err) {
      console.warn("[devBypass.isEnabled] error:", err);
      return false;
    }
  },

  async getInfo(): Promise<{ enabled: boolean }> {
    if (Platform.OS !== "android" || !DevBypassBridgeModule) {
      return { enabled: false };
    }
    try {
      const res = await DevBypassBridgeModule.getBypassInfo();
      return { enabled: !!res?.enabled };
    } catch (err) {
      console.warn("[devBypass.getInfo] error:", err);
      return { enabled: false };
    }
  },
  async enable(): Promise<void> {
    if (Platform.OS !== "android" || !DevBypassBridgeModule) return;
    try {
      if (DevBypassBridgeModule.enable) {
        DevBypassBridgeModule.enable();
      }
    } catch (err) {
      console.warn("[devBypass.enable] error:", err);
    }
  },

  async disable(): Promise<void> {
    if (Platform.OS !== "android" || !DevBypassBridgeModule) return;
    try {
      if (DevBypassBridgeModule.disable) {
        DevBypassBridgeModule.disable();
      }
    } catch (err) {
      console.warn("[devBypass.disable] error:", err);
    }
  },
};
