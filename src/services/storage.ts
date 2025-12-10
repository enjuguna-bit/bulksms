import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Customer, Transaction } from "@/types";

// =========================================================
// ⚡ AsyncStorage Instance (Asynchronous)
// =========================================================
// No instance needed, using static methods

// ---------------------------------------------------------
// 📨 Bulk SMS Log Types & Keys
// ---------------------------------------------------------
export interface SendLog {
  phone: string;
  status: "SENT" | "FAILED" | "UNSUPPORTED";
  at: string; // ISO timestamp
  atMs?: number;
  error?: string | null;
}

const LOG_KEY = "sms_logs_v1";

// ---------------------------------------------------------
// 📇 Contacts Types & Keys
// ---------------------------------------------------------
export interface SavedContact {
  id: string;
  name: string;
  phoneNumber: string;
}

const CONTACTS_KEY = "saved_contacts_v1";

// ---------------------------------------------------------
// 🏪 Customer Database Types & Keys
// ---------------------------------------------------------
const CUSTOMER_KEY = "customers_v1";

// ---------------------------------------------------------
// 🔐 Safe JSON helpers
// ---------------------------------------------------------

async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    // Basic type guard for arrays
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      console.warn(`[Storage] ${key} corrupted. Resetting.`);
      return fallback;
    }

    return parsed as T;
  } catch (e) {
    console.warn(`[Storage] Failed to parse ${key}:`, e);
    return fallback;
  }
}

async function safeSet(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Storage] Failed to save ${key}:`, e);
  }
}

// ---------------------------------------------------------
// 📑 SMS LOG FUNCTIONS
// ---------------------------------------------------------

/** Save one message log (atomic append) */
export async function saveSendLog(log: SendLog): Promise<void> {
  const logs = await safeGet<SendLog[]>(LOG_KEY, []);
  logs.push({ ...log, atMs: log.atMs ?? Date.now() });
  await safeSet(LOG_KEY, logs);
}

/** Get all saved logs */
export async function getSendLogs(): Promise<SendLog[]> {
  return safeGet<SendLog[]>(LOG_KEY, []);
}

/** Clear log table */
export async function clearSendLogs(): Promise<void> {
  await AsyncStorage.removeItem(LOG_KEY);
}

// ---------------------------------------------------------
// 📇 CONTACTS FUNCTIONS
// ---------------------------------------------------------

export async function saveContactsList(list: SavedContact[]): Promise<void> {
  await safeSet(CONTACTS_KEY, list);
}

export async function getContactsList(): Promise<SavedContact[]> {
  return safeGet<SavedContact[]>(CONTACTS_KEY, []);
}

export async function clearContacts(): Promise<void> {
  await AsyncStorage.removeItem(CONTACTS_KEY);
}

// ---------------------------------------------------------
// 🧾 CUSTOMER FUNCTIONS
// ---------------------------------------------------------

/** Add or update a customer */
export async function saveCustomer(customer: Customer): Promise<void> {
  const existing = await getCustomers();
  const filtered = existing.filter((c) => c.id !== customer.id);
  filtered.push(customer);
  await safeSet(CUSTOMER_KEY, filtered);
}

/** Get all customers */
export async function getCustomers(): Promise<Customer[]> {
  return safeGet<Customer[]>(CUSTOMER_KEY, []);
}

export async function clearCustomers(): Promise<void> {
  await AsyncStorage.removeItem(CUSTOMER_KEY);
}

/** Backwards compatibility alias */
export async function getCustomerRecords(): Promise<Customer[]> {
  return getCustomers();
}

// ---------------------------------------------------------
// 🧹 CLEAR ALL DATA (for settings screen)
// ---------------------------------------------------------

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([CUSTOMER_KEY, LOG_KEY, CONTACTS_KEY]);
}
