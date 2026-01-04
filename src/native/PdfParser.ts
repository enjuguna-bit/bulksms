/**
 * PdfParser.ts - TypeScript bridge to native PdfParserModule
 * 
 * Provides on-device PDF parsing for M-Pesa statements using
 * Android's PDFBox library (via native module).
 */

import { NativeModules, Platform } from 'react-native';

interface PdfParseResult {
  success: boolean;
  text: string;
  length: number;
}

interface PdfMetadata {
  pageCount: number;
  title: string;
  author: string;
  subject: string;
  creator: string;
  isEncrypted: boolean;
}

interface PageRangeResult {
  success: boolean;
  text: string;
  startPage: number;
  endPage: number;
  totalPages: number;
}

interface PdfParserModuleInterface {
  parsePdf(filePath: string, password: string): Promise<PdfParseResult>;
  parsePdfFromBase64(base64Data: string, password: string): Promise<PdfParseResult>;
  isPasswordProtected(filePath: string): Promise<boolean>;
  getPdfMetadata(filePath: string, password: string): Promise<PdfMetadata>;
  extractPageRange(
    filePath: string,
    password: string,
    startPage: number,
    endPage: number
  ): Promise<PageRangeResult>;
}

const { PdfParserModule } = NativeModules;

/**
 * Check if the native PDF parser module is available
 */
export function isPdfParserAvailable(): boolean {
  return Platform.OS === 'android' && PdfParserModule != null;
}

/**
 * Parse a PDF file and extract all text content
 * 
 * @param filePath - Path to the PDF file
 * @param password - Password for encrypted PDFs (empty string for unencrypted)
 * @returns Promise with parsed text result
 */
export async function parsePdf(
  filePath: string,
  password: string = ''
): Promise<PdfParseResult> {
  if (!isPdfParserAvailable()) {
    throw new Error('PDF parsing is only available on Android');
  }
  
  return (PdfParserModule as PdfParserModuleInterface).parsePdf(filePath, password);
}

/**
 * Parse a PDF from base64 encoded data
 * 
 * @param base64Data - Base64 encoded PDF content
 * @param password - Password for encrypted PDFs
 * @returns Promise with parsed text result
 */
export async function parsePdfFromBase64(
  base64Data: string,
  password: string = ''
): Promise<PdfParseResult> {
  if (!isPdfParserAvailable()) {
    throw new Error('PDF parsing is only available on Android');
  }
  
  return (PdfParserModule as PdfParserModuleInterface).parsePdfFromBase64(base64Data, password);
}

/**
 * Check if a PDF file is password protected
 * 
 * @param filePath - Path to the PDF file
 * @returns Promise resolving to true if encrypted
 */
export async function isPasswordProtected(filePath: string): Promise<boolean> {
  if (!isPdfParserAvailable()) {
    throw new Error('PDF parsing is only available on Android');
  }
  
  return (PdfParserModule as PdfParserModuleInterface).isPasswordProtected(filePath);
}

/**
 * Get PDF metadata (page count, title, etc.)
 * 
 * @param filePath - Path to the PDF file
 * @param password - Password if encrypted
 * @returns Promise with PDF metadata
 */
export async function getPdfMetadata(
  filePath: string,
  password: string = ''
): Promise<PdfMetadata> {
  if (!isPdfParserAvailable()) {
    throw new Error('PDF parsing is only available on Android');
  }
  
  return (PdfParserModule as PdfParserModuleInterface).getPdfMetadata(filePath, password);
}

/**
 * Extract text from a specific page range
 * 
 * @param filePath - Path to the PDF file
 * @param password - Password if encrypted
 * @param startPage - Starting page (1-indexed)
 * @param endPage - Ending page (1-indexed)
 * @returns Promise with extracted text and page info
 */
export async function extractPageRange(
  filePath: string,
  password: string,
  startPage: number,
  endPage: number
): Promise<PageRangeResult> {
  if (!isPdfParserAvailable()) {
    throw new Error('PDF parsing is only available on Android');
  }
  
  return (PdfParserModule as PdfParserModuleInterface).extractPageRange(
    filePath,
    password,
    startPage,
    endPage
  );
}

export default {
  isPdfParserAvailable,
  parsePdf,
  parsePdfFromBase64,
  isPasswordProtected,
  getPdfMetadata,
  extractPageRange,
};
