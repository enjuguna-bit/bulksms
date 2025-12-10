import { getSendLogs, clearSendLogs, type SendLog } from "./storage";

/**
 * 📜 Fetch all message logs.
 * - Sorted by most recent first.
 * - Returns an empty array on error.
 */
export async function fetchLogs(): Promise<SendLog[]> {
  try {
    const logs = await getSendLogs();
    return logs.sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));
  } catch (e) {
    console.warn("[Logs] Failed to fetch logs:", e);
    return [];
  }
}

/**
 * 🧹 Clear all stored logs.
 */
export async function resetLogs(): Promise<void> {
  try {
    await clearSendLogs();
  } catch (e) {
    console.warn("[Logs] Failed to clear logs:", e);
  }
}
