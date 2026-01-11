// ------------------------------------------------------
// 📇 src/types/index.ts
// Global type definitions for BulkSMS (React Native CLI)
// Unified Types for Contacts, Payments, Transactions, Storage
// ------------------------------------------------------

// ======================================================
// 📤 Bulk SMS Upload Persistence Types
// ======================================================
export * from "./bulkSms";

// ======================================================
// 📱 Phonebook Contact
// ======================================================

/** A single contact fetched from the device phonebook */
export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

// ======================================================
// 📤 Bulk SMS Recipients (Excel / Manual Entry)
// ======================================================

export interface BulkSMSRecipient {
  name: string;
  phone: string;
  amount?: number | null;
}

// ======================================================
// 💳 Parsed M-PESA Payment (Canonical)
// ======================================================

// ======================================================
// 💳 Parsed M-PESA Payment (Canonical)
// ======================================================

export * from "./ParsedPayment";
import { ParsedPaymentType } from "./ParsedPayment";

// ======================================================
// 🗂 Transaction Record (Used Across POS + Storage)
// ======================================================

export interface Transaction {
  id: string;
  phoneNumber: string;
  customerName: string;
  amount: number;
  type: ParsedPaymentType;
  date: string; // ISO format
  rawMessage: string;
}

// ======================================================
// 👥 Customer Aggregate (Multiple Transactions)
// ======================================================

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  transactions: Transaction[];
  createdAt: string; // ISO timestamp
}

// ======================================================
// 🧾 CustomerRecord (Canonical Payment-Capture Record)
// Re-exported from src/types/CustomerRecord.ts
// ======================================================

export type {
  CustomerRecord,
  LocalRecordItem,
  RecordItem,
} from "./CustomerRecord";

// ======================================================
// 📤 SMS Sending Result (Native Android SMS Module)
// ======================================================

export interface SendResult {
  phone: string;
  status: "SENT" | "FAILED" | "UNSUPPORTED" | "CANCELLED";
  error?: string | null;
  at: string; // ISO timestamp
}

// ======================================================
// 🧭 Navigation Types
// ======================================================

export type ChatRouteParams = {
  threadId?: number;
  conversationId?: number;
  address: string;
  name?: string;
  initialMessage?: any;
};

export type RootStackParamList = {
  Startup: undefined;
  Onboarding: undefined;
  Expired: undefined;
  Paywall: undefined;
  Subscription: undefined;
  PaymentDashboard: undefined;
  ThreadsScreen: undefined;
  ChatScreen: ChatRouteParams;
  BulkPro: undefined;
  SendSms: undefined;
  Transactions: undefined;
  Inbox: undefined;
  CustomerDatabase: undefined;
  ContactPicker: { mode: 'single' | 'multiple'; onSelect?: any };
  TransactionCleaner: undefined;
  DataExport: undefined;
  SystemHealth: undefined;
  MpesaParserScreen: undefined;
  SmsScheduler: undefined;
  Debug: undefined;
  LipanaSettings: undefined;
  Billing: undefined;
  Tabs: undefined;
  SplitContacts: undefined;
  CampaignList: undefined;
  CampaignDetail: { campaignId: number };
  CreateCampaign: undefined;
  Blacklist: undefined;
  InboxScanner: undefined;
  AiSettings: undefined;
};
