/**
 * mpesaPdfParserService.ts - On-device PDF parsing service for M-Pesa statements
 * 
 * Handles:
 * - PDF file reading via native PDFBox module (Android)
 * - Password-protected PDF decryption
 * - Transaction parsing
 * - Export to CSV/JSON
 * 
 * Uses native Android PDFBox library for on-device PDF processing.
 * No server communication required - all parsing happens locally.
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import {
  isPdfParserAvailable,
  parsePdf as nativeParsePdf,
  parsePdfFromBase64 as nativeParsePdfFromBase64,
} from '@/native/PdfParser';

export interface MpesaPdfTransaction {
  id: string;
  depotNo: string;
  completionTime: string;
  date: string;
  time: string;
  details: string;
  status: string;
  paidIn: number;
  rawLine: string;
  category?: string; // Transaction category
}

export interface ParseStats {
  totalLines: number;
  parsedLines: number;
  skippedLines: number;
  startDate?: string;
  endDate?: string;
}

export interface ParseResult {
  success: boolean;
  transactions: MpesaPdfTransaction[];
  totalProcessed: number;
  highValueCount: number;
  error?: string;
  stats?: ParseStats;
}

class MpesaPdfParserService {
  private readonly MIN_AMOUNT = 5000;

  /**
   * Parse M-Pesa PDF statement
   * Note: This is a placeholder for actual PDF parsing.
   * In production, you would integrate:
   * - pdf.js for JavaScript-based PDF parsing
   * - A native module for password-protected PDF decryption
   */
  async parsePdfStatement(
    pdfUri: string,
    password: string
  ): Promise<ParseResult> {
    try {
      // 1. Get clean file path
      const filePath = await this.getCleanFilePath(pdfUri);

      // 2. Extract text from PDF using native module
      const pdfText = await this.extractPdfText(filePath, password);

      // 3. Parse transactions from text
      const transactions = await this.parseTransactionsAsync(pdfText);

      // 4. Filter for high-value transactions
      const highValueTransactions = transactions.filter(
        (t) => t.paidIn >= this.MIN_AMOUNT
      );

      // 5. Generate statistics
      const stats = this.generateStats(transactions, pdfText);

      return {
        success: true,
        transactions: highValueTransactions,
        totalProcessed: transactions.length,
        highValueCount: highValueTransactions.length,
        stats,
      };
    } catch (error: any) {
      console.error('[mpesaPdfParser] Error:', error);

      // Handle specific errors
      if (error.message?.includes('password')) {
        return {
          success: false,
          transactions: [],
          totalProcessed: 0,
          highValueCount: 0,
          error: 'Incorrect PDF password. Please try again.',
        };
      }

      if (error.message?.includes('corrupt')) {
        return {
          success: false,
          transactions: [],
          totalProcessed: 0,
          highValueCount: 0,
          error: 'PDF file is corrupted or invalid.',
        };
      }

      return {
        success: false,
        transactions: [],
        totalProcessed: 0,
        highValueCount: 0,
        error: `Failed to parse PDF: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Get clean file path from URI, copying content:// URIs to cache if needed
   */
  private async getCleanFilePath(uri: string): Promise<string> {
    try {
      let filePath = uri;

      // Handle different URI formats
      if (Platform.OS === 'android') {
        if (uri.startsWith('content://')) {
          // For Android content URIs, copy to cache first
          const destPath = `${RNFS.CachesDirectoryPath}/temp_mpesa_${Date.now()}.pdf`;
          await RNFS.copyFile(uri, destPath);
          filePath = destPath;
        } else if (uri.startsWith('file://')) {
          filePath = uri.replace('file://', '');
        }
      } else {
        // iOS
        if (uri.startsWith('file://')) {
          filePath = uri.replace('file://', '');
        }
      }

      return filePath;
    } catch (error: any) {
      throw new Error(`Failed to prepare PDF file: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF with password using native PDFBox module
   * 
   * On Android: Uses native PDFBox library for on-device decryption
   * On iOS: Falls back to manual text input (PDF parsing not yet implemented)
   */
  private async extractPdfText(
    filePath: string,
    password: string
  ): Promise<string> {
    // Validate password format (M-Pesa usually uses 6 digits)
    if (!password || password.length < 4) {
      throw new Error('Invalid password format');
    }

    // Check if native PDF parser is available
    if (!isPdfParserAvailable()) {
      if (Platform.OS === 'ios') {
        throw new Error(
          'PDF parsing on iOS is not yet supported. Please use the "Paste Text" mode to manually paste extracted text from your PDF reader.'
        );
      }
      throw new Error(
        'Native PDF parser module not available. Please rebuild the app.'
      );
    }

    try {
      // Use native PDFBox module to parse the PDF
      const result = await nativeParsePdf(filePath, password);

      if (!result.success || !result.text) {
        throw new Error('PDF parsing returned empty result');
      }

      return result.text;
    } catch (error: any) {
      // Re-throw with more context
      const message = error.message || 'Unknown error';

      if (message.includes('INVALID_PASSWORD')) {
        throw new Error('Incorrect PDF password. Please try again.');
      }
      if (message.includes('ENCRYPTED')) {
        throw new Error('PDF is encrypted. Please provide a password.');
      }
      if (message.includes('CORRUPT_PDF')) {
        throw new Error('PDF file is corrupted or invalid.');
      }
      if (message.includes('OUT_OF_MEMORY')) {
        throw new Error('PDF file is too large to process on this device.');
      }

      throw error;
    }
  }

  /**
   * Parse text that has already been extracted from PDF
   * This is useful when you manually provide the extracted text
   */
  async parseExtractedText(text: string): Promise<ParseResult> {
    try {
      const transactions = await this.parseTransactionsAsync(text);
      const highValueTransactions = transactions.filter(
        (t) => t.paidIn >= this.MIN_AMOUNT
      );
      const stats = this.generateStats(transactions, text);

      return {
        success: true,
        transactions: highValueTransactions,
        totalProcessed: transactions.length,
        highValueCount: highValueTransactions.length,
        stats,
      };
    } catch (error: any) {
      return {
        success: false,
        transactions: [],
        totalProcessed: 0,
        highValueCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Parse transactions from PDF text (async for large files)
   */
  private async parseTransactionsAsync(
    pdfText: string
  ): Promise<MpesaPdfTransaction[]> {
    const lines = pdfText.split('\n');
    const transactions: MpesaPdfTransaction[] = [];
    let bufferLines: string[] = [];

    const CHUNK_SIZE = 100;
    let i = 0;

    while (i < lines.length) {
      const chunkEnd = Math.min(i + CHUNK_SIZE, lines.length);

      for (let j = i; j < chunkEnd; j++) {
        const line = lines[j].trim();

        if (!line) continue;

        const isTransactionStart = this.isTransactionLine(line);

        if (isTransactionStart) {
          if (bufferLines.length > 0) {
            const transaction = this.parseBufferedTransaction(bufferLines);
            if (transaction) {
              transactions.push(transaction);
            }
            bufferLines = [];
          }
          bufferLines.push(line);
        } else if (bufferLines.length > 0) {
          bufferLines.push(line);
        }
      }

      i = chunkEnd;

      // Yield to the event loop every chunk
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Process last transaction
    if (bufferLines.length > 0) {
      const transaction = this.parseBufferedTransaction(bufferLines);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return transactions.sort(
      (a, b) =>
        new Date(b.completionTime).getTime() -
        new Date(a.completionTime).getTime()
    );
  }

  /**
   * Check if line is a transaction start
   */
  private isTransactionLine(line: string): boolean {
    // Match patterns like: "VC3I    2025-12-12 11:08:06" or transaction codes
    const transactionPattern =
      /^([A-Z0-9\/]{3,12})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;
    return transactionPattern.test(line);
  }

  /**
   * Parse buffered transaction lines
   */
  private parseBufferedTransaction(
    lines: string[]
  ): MpesaPdfTransaction | null {
    if (lines.length === 0) return null;

    const fullText = lines.join(' ');
    const firstLine = lines[0];

    // Extract Depot No. and Time
    const headerMatch = firstLine.match(
      /^([A-Z0-9\/]{3,12})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/
    );
    if (!headerMatch) return null;

    const depotNo = headerMatch[1];
    const completionTime = headerMatch[2];
    const [date, time] = completionTime.split(' ');

    // Extract details and amount
    let details = '';
    let paidIn = 0;
    let status = 'Completed';

    // Look for amount pattern in all lines
    for (const line of lines) {
      // Extract status
      if (line.includes('Completed')) status = 'Completed';
      else if (line.includes('Failed')) status = 'Failed';
      else if (line.includes('Pending')) status = 'Pending';

      // Look for "Paid In" amount pattern
      const paidInMatch = line.match(
        /(?:Paid\s+In|Received|Credit)[:\s]+(?:Ksh?\s?)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
      );
      if (paidInMatch) {
        const amountStr = paidInMatch[1].replace(/,/g, '');
        paidIn = parseFloat(amountStr);
      }

      // Fallback: Look for any amount at end of line
      if (paidIn === 0) {
        const amountMatch = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})$/);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/,/g, '');
          const amount = parseFloat(amountStr);
          if (amount > 0) {
            paidIn = amount;
          }
        }
      }
    }

    // Extract details from the middle of the text
    const detailsMatch = fullText.match(
      /\d{2}:\d{2}:\d{2}\s+(.*?)(?:\s+(?:Completed|Failed|Pending)|\s+\d{1,3}(?:,\d{3})*\.\d{2})/
    );
    if (detailsMatch) {
      details = detailsMatch[1].trim();
    } else {
      // Fallback: take everything after the datetime
      const afterTime = fullText.replace(
        /^[A-Z0-9\/]+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+/,
        ''
      );
      details = afterTime.substring(0, 100).trim();
    }

    // Generate unique ID
    const id = `${depotNo}_${completionTime.replace(/[^0-9]/g, '')}`;

    return {
      id,
      depotNo,
      completionTime,
      date,
      time,
      details: details.trim(),
      status,
      paidIn,
      rawLine: lines.join(' | '),
      category: this.categorizeTransaction(details.trim()), // Categorize transaction
    };
  }

  /**
   * Generate parsing statistics
   */
  private generateStats(
    transactions: MpesaPdfTransaction[],
    pdfText: string
  ): ParseStats {
    const lines = pdfText.split('\n');
    const dates = transactions.map((t) => t.date).filter(Boolean);

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dates.length > 0) {
      const timestamps = dates.map((d) => new Date(d).getTime());
      startDate = new Date(Math.min(...timestamps)).toISOString().split('T')[0];
      endDate = new Date(Math.max(...timestamps)).toISOString().split('T')[0];
    }

    return {
      totalLines: lines.length,
      parsedLines: transactions.length,
      skippedLines: lines.length - transactions.length,
      startDate,
      endDate,
    };
  }

  /**
   * Export transactions to CSV
   */
  async exportToCsv(transactions: MpesaPdfTransaction[]): Promise<string> {
    const headers = ['Date', 'Time', 'Depot No.', 'Details', 'Category', 'Amount', 'Status'];
    const rows = transactions.map((t) => [
      t.date,
      t.time,
      t.depotNo,
      `"${t.details.replace(/"/g, '""')}"`,
      t.category || 'Other',
      t.paidIn.toFixed(2),
      t.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const fileName = `mpesa_high_value_${Date.now()}.csv`;
    const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

    await RNFS.writeFile(filePath, csvContent, 'utf8');
    return filePath;
  }

  /**
   * Export transactions to Excel (CSV format with Excel-compatible headers)
   */
  async exportToExcel(transactions: MpesaPdfTransaction[]): Promise<string> {
    const headers = ['Date', 'Time', 'Depot No.', 'Details', 'Category', 'Amount', 'Status'];
    const rows = transactions.map((t) => [
      t.date,
      t.time,
      t.depotNo,
      `"${t.details.replace(/"/g, '""')}"`,
      t.category || 'Other',
      t.paidIn.toFixed(2),
      t.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const fileName = `mpesa_high_value_${Date.now()}.csv`; // Excel can open CSV files
    const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      return filePath;
    } catch (error) {
      // Fallback to Documents directory if Downloads is not accessible
      const fallbackPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(fallbackPath, csvContent, 'utf8');
      return fallbackPath;
    }
  }

  /**
   * Export transactions to JSON
   */
  async exportToJson(transactions: MpesaPdfTransaction[]): Promise<string> {
    const jsonContent = JSON.stringify(transactions, null, 2);
    const fileName = `mpesa_high_value_${Date.now()}.json`;
    const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, jsonContent, 'utf8');
      return filePath;
    } catch (error) {
      // Fallback to Documents directory
      const fallbackPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(fallbackPath, jsonContent, 'utf8');
      return fallbackPath;
    }
  }

  /**
   * Parse M-Pesa statement text directly (without PDF)
   * Useful for testing or when text is already extracted
   */
  parseMpesaStatementText(text: string): MpesaPdfTransaction[] {
    const lines = text.split('\n');
    const transactions: MpesaPdfTransaction[] = [];
    let bufferLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (this.isTransactionLine(trimmed)) {
        if (bufferLines.length > 0) {
          const tx = this.parseBufferedTransaction(bufferLines);
          if (tx) transactions.push(tx);
          bufferLines = [];
        }
        bufferLines.push(trimmed);
      } else if (bufferLines.length > 0) {
        bufferLines.push(trimmed);
      }
    }

    if (bufferLines.length > 0) {
      const tx = this.parseBufferedTransaction(bufferLines);
      if (tx) transactions.push(tx);
    }

    return transactions;
  }

  /**
   * Categorize a transaction based on its details
   */
  categorizeTransaction(details: string): string {
    const lowerDetails = details.toLowerCase();

    // Airtime & Data
    if (lowerDetails.includes('airtime') || lowerDetails.includes('data') ||
        lowerDetails.includes('top up') || lowerDetails.includes('bundle') ||
        lowerDetails.includes('sambaza') || lowerDetails.includes('tuone')) {
      return 'Airtime & Data';
    }

    // PayBill & Merchant Payments
    if (lowerDetails.includes('paybill') || lowerDetails.includes('pay bill') ||
        lowerDetails.includes('merchant') || lowerDetails.includes('business') ||
        lowerDetails.includes('till') || lowerDetails.includes('lipa na m-pesa')) {
      return 'PayBill Payments';
    }

    // Buy Goods & Till Payments
    if (lowerDetails.includes('buy goods') || lowerDetails.includes('till payment') ||
        lowerDetails.includes('buy goods till')) {
      return 'Buy Goods & Till';
    }

    // Send Money & Transfers
    if (lowerDetails.includes('sent to') || lowerDetails.includes('transfer to') ||
        lowerDetails.includes('send money') || lowerDetails.includes('money transfer') ||
        lowerDetails.includes('fuliza') || lowerDetails.includes('loan')) {
      return 'Send Money';
    }

    // Withdrawals
    if (lowerDetails.includes('withdrawal') || lowerDetails.includes('agent withdrawal') ||
        lowerDetails.includes('cash withdrawal') || lowerDetails.includes('atm withdrawal')) {
      return 'Withdrawals';
    }

    // Deposits & Received Money
    if (lowerDetails.includes('received from') || lowerDetails.includes('deposit') ||
        lowerDetails.includes('received money') || lowerDetails.includes('incoming money') ||
        lowerDetails.includes('credited') || lowerDetails.includes('cash deposit')) {
      return 'Deposits';
    }

    // Bill Payments
    if (lowerDetails.includes('bill payment') || lowerDetails.includes('utility') ||
        lowerDetails.includes('kplc') || lowerDetails.includes('nairobi water') ||
        lowerDetails.includes('kenya power') || lowerDetails.includes('service payment')) {
      return 'Bill Payments';
    }

    // M-Pesa Charges & Fees
    if (lowerDetails.includes('transaction charge') || lowerDetails.includes('fee') ||
        lowerDetails.includes('commission') || lowerDetails.includes('maintenance')) {
      return 'Charges & Fees';
    }

    // Reversals & Refunds
    if (lowerDetails.includes('reversal') || lowerDetails.includes('refund') ||
        lowerDetails.includes('reversed')) {
      return 'Reversals & Refunds';
    }

    // Balance Inquiry
    if (lowerDetails.includes('balance') || lowerDetails.includes('check balance') ||
        lowerDetails.includes('account balance')) {
      return 'Balance Inquiry';
    }

    // Default category
    return 'Other';
  }
}

export const mpesaPdfParserService = new MpesaPdfParserService();
export default mpesaPdfParserService;
