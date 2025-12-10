// ------------------------------------------------------
// 📘 src/utils/csv-pro.ts
// Unified CSV parser & exporter for BulkSMS Pro
// React Native CLI version (no Expo)
// ------------------------------------------------------

import ReactNativeBlobUtil from 'react-native-blob-util';
import { parseCSV, toCsv, autoSuggestMapping as autoSuggest } from './csvParser';
import type { BulkSMSRecipient } from '@/types';

// ------------------------------------------------------
// 🧩 1. Core helpers
// ------------------------------------------------------

/** Clean up cell value (removes invisible chars & trims). */
function cleanCell(value: unknown): string {
  if (value == null) return '';
  return value
    .toString()
    .replace(/[\u200B\u00A0]/g, '')
    .trim();
}

/** Parse amount (e.g. "Ksh 1,200.00" → 1200). */
function parseAmount(value: unknown): number {
  const clean = cleanCell(value)
    .replace(/(Ksh|KES|ksh|kes)/gi, '')
    .replace(/,/g, '')
    .trim();
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : 0;
}

/** Convert numeric phone cell to string cleanly. */
function parsePhone(value: unknown): string {
  if (typeof value === 'number') return String(value);
  return cleanCell(value);
}

// ------------------------------------------------------
// 🧭 2. Mapping detection
// ------------------------------------------------------

export function autoSuggestMapping(headers: string[]) {
  return autoSuggest(headers);
}

// ------------------------------------------------------
// 📦 3. Main parsers
// ------------------------------------------------------

/**
 * ✅ Parse CSV file from local URI (React Native Blob Util)
 */
export async function parseCsvFile(uri: string): Promise<BulkSMSRecipient[]> {
  try {
    const content = await ReactNativeBlobUtil.fs.readFile(uri, 'utf8');
    const rows = parseCSV(content);
    const headers = Object.keys(rows[0] || {});
    const { name, phone, amount } = autoSuggest(headers);

    if (!rows.length) return [];

    return rows
      .map(r => ({
        name: cleanCell(r[name ?? 'FullNames']),
        phone: parsePhone(r[phone ?? 'PhoneNumber']),
        amount: parseAmount(r[amount ?? 'Arrears Amount']),
      }))
      .filter(r => r.phone);
  } catch (e) {
    console.error('❌ parseCsvFile error:', e);
    return [];
  }
}

/**
 * ✅ Parse CSV from text content
 */
export async function parseCsvText(
  content: string
): Promise<BulkSMSRecipient[]> {
  try {
    const rows = parseCSV(content);
    const headers = Object.keys(rows[0] || {});
    const { name, phone, amount } = autoSuggest(headers);

    if (!rows.length) return [];

    return rows
      .map(r => ({
        name: cleanCell(r[name ?? 'FullNames']),
        phone: parsePhone(r[phone ?? 'PhoneNumber']),
        amount: parseAmount(r[amount ?? 'Arrears Amount']),
      }))
      .filter(r => r.phone);
  } catch (e) {
    console.error('❌ parseCsvText error:', e);
    return [];
  }
}

// ------------------------------------------------------
// 📤 4. Export helpers
// ------------------------------------------------------

/**
 * ✅ Export recipients to a new CSV file in cache dir.
 * Returns absolute file path ready for sharing or upload.
 */
export async function exportToCsv(
  data: BulkSMSRecipient[],
  fileName = 'Recipients.csv'
): Promise<string> {
  try {
    const csvContent = toCsv(data as Record<string, any>[]);
    const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
    await ReactNativeBlobUtil.fs.writeFile(filePath, csvContent, 'utf8');
    return filePath;
  } catch (e) {
    console.error('❌ exportToCsv error:', e);
    return '';
  }
}

/** ✅ Convert recipients to CSV string. */
export { toCsv };
