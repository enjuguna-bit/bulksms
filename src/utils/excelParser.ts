// ------------------------------------------------------
// 📘 src/utils/excelParser.ts
// Excel file parser supporting .xlsx, .xls, and CSV formats
// Uses xlsx library for Excel files and existing CSV parser
// ------------------------------------------------------

import * as XLSX from 'xlsx';
import { parseCSV, autoSuggestMapping } from './csvParser';
import type { BulkSMSRecipient } from '@/types';

/**
 * Supported file types for import
 */
export enum ImportFileType {
  CSV = 'csv',
  XLSX = 'xlsx',
  XLS = 'xls',
  UNKNOWN = 'unknown'
}

/**
 * Detect file type from file name and extension
 */
export function detectFileType(fileName: string): ImportFileType {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'csv':
      return ImportFileType.CSV;
    case 'xlsx':
      return ImportFileType.XLSX;
    case 'xls':
      return ImportFileType.XLS;
    default:
      return ImportFileType.UNKNOWN;
  }
}

/**
 * Parse Excel file (.xlsx or .xls) and convert to CSV-like format
 */
export async function parseExcelFile(fileUri: string): Promise<Record<string, string>[]> {
  try {
    // Read the Excel file using xlsx library
    const workbook = XLSX.readFile(fileUri, { type: 'file' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no worksheets');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert worksheet to JSON with raw values
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    }) as (string | number | boolean)[][];
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    // Get headers from first row
    const headers = jsonData[0].map(h => String(h).trim());
    
    // Convert data rows to objects
    const data: Record<string, string>[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows
      
      const rowObject: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowObject[header] = String(row[index] || '').trim();
      });
      
      data.push(rowObject);
    }
    
    return data;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Universal file parser that handles both Excel and CSV files
 */
export async function parseImportFile(fileUri: string, fileName: string): Promise<Record<string, string>[]> {
  const fileType = detectFileType(fileName);
  
  switch (fileType) {
    case ImportFileType.CSV:
      // For CSV files, read content and use existing parser
      const ReactNativeBlobUtil = require('react-native-blob-util').default;
      let path = fileUri.startsWith('file://') ? fileUri.replace('file://', '') : fileUri;
      path = decodeURIComponent(path);
      const content = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
      return parseCSV(content);
      
    case ImportFileType.XLSX:
    case ImportFileType.XLS:
      // For Excel files, use Excel parser
      return await parseExcelFile(fileUri);
      
    default:
      throw new Error(`Unsupported file type: ${fileName}. Please use CSV, XLSX, or XLS files.`);
  }
}

/**
 * Enhanced CSV parser with Excel support
 * Auto-detects file type and parses accordingly
 */
export async function parseExcelSmart(
  fileUri: string,
  fileName: string
): Promise<{ rows: BulkSMSRecipient[]; mapping: Record<string, string | null> }> {
  try {
    const data = await parseImportFile(fileUri, fileName);

    if (!data.length) {
      return { rows: [], mapping: { name: null, phone: null, amount: null } };
    }

    // --- Define header aliases ---
    const ALIASES = {
      name: ['FullNames', 'Full Name', 'CustomerName', 'Name', 'Client'],
      phone: ['PhoneNumber', 'Phone', 'MobilePhone', 'Contact', 'Phone No'],
      amount: ['Arrears Amount', 'Amount', 'Balance', 'Loan', 'Cost', 'Arrears'],
    };

    const headers = Object.keys(data[0] || {});
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, ''));

    const findMatch = (aliases: string[]): string | null => {
      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
        const idx = normalizedHeaders.indexOf(normalizedAlias);
        if (idx !== -1) return headers[idx];
      }
      return null;
    };

    const mapping = {
      name: findMatch(ALIASES.name),
      phone: findMatch(ALIASES.phone),
      amount: findMatch(ALIASES.amount),
    };

    const results: BulkSMSRecipient[] = [];

    for (const row of data) {
      const name = cleanCellValue(
        mapping.name ? row[mapping.name] : row['FullNames'] || row['Name']
      );

      const phoneRaw =
        mapping.phone ? row[mapping.phone] : row['PhoneNumber'] || row['Phone'];
      const phone = cleanCellValue(phoneRaw);

      const amount = mapping.amount
        ? parseAmount(row[mapping.amount])
        : parseAmount(row['Amount']);

      if (!phone) continue;
      results.push({ name, phone, amount });
    }

    return { rows: results, mapping };
  } catch (error) {
    console.error('❌ File parsing error:', error);
    return { rows: [], mapping: { name: null, phone: null, amount: null } };
  }
}

/** Normalize headers for fuzzy comparison. */
function normalizeHeader(header: string): string {
    return header.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
}

/** Clean cell values (remove invisible characters, trim). */
function cleanCellValue(value: unknown): string {
    if (value == null) return '';
    return value
        .toString()
        .replace(/[\u200B\u00A0]/g, '')
        .trim();
}

/** Parse amount such as "Ksh 1,200.00" → 1200. */
function parseAmount(value: unknown): number | null {
    const clean = cleanCellValue(value)
        .replace(/(Ksh|KES|ksh|kes)/gi, '')
        .replace(/,/g, '')
        .trim();
    const num = parseFloat(clean);
    return Number.isFinite(num) ? num : null;
}

/**
 * Get file type display name for user feedback
 */
export function getFileTypeDisplayName(fileName: string): string {
  const fileType = detectFileType(fileName);
  
  switch (fileType) {
    case ImportFileType.CSV:
      return 'CSV';
    case ImportFileType.XLSX:
      return 'Excel (XLSX)';
    case ImportFileType.XLS:
      return 'Excel (XLS)';
    default:
      return 'Unknown';
  }
}

/**
 * Validate if file type is supported
 */
export function isFileTypeSupported(fileName: string): boolean {
  return detectFileType(fileName) !== ImportFileType.UNKNOWN;
}

/**
 * ✅ Export JSON data to CSV format.
 * Useful for saving reports or offline backups.
 */
export function exportToCSV<T>(data: T[], fileName: string = 'export.csv') {
  const { toCsv } = require('./csvParser');
  return toCsv(data as Record<string, any>[]);
}

// Re-export utilities from csvParser for backward compatibility
export const toCsv = (() => {
  const { toCsv } = require('./csvParser');
  return toCsv;
})();
export const summarizeMapping = (() => {
  const { summarizeMapping } = require('./csvParser');
  return summarizeMapping;
})();
