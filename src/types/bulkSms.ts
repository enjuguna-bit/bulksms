// ------------------------------------------------------
// 📤 src/types/bulkSms.ts
// Types for Bulk SMS Excel Upload Persistence
// ------------------------------------------------------

/**
 * Generic type for a row parsed from an Excel file.
 * Keys are column headers, values are cell content.
 */
export type ExcelRow = Record<string, string | number | boolean | null | undefined>;

/**
 * Validated recipient ready for sending.
 */
export interface Recipient {
    name: string;
    phone: string;
    amount?: number | null;
    edited?: boolean;
    /** Dynamic fields from Excel columns - supports any header as placeholder */
    fields?: Record<string, string | number | null>;
}

/**
 * Represents a complete Excel upload session with metadata.
 * Used for persisting and resuming bulk SMS campaigns.
 */
export interface ExcelUploadData {
    /** Unique identifier for the upload session */
    fileId: string;
    /** Original file name */
    fileName: string;
    /** Timestamp when file was uploaded (ms since epoch) */
    uploadTimestamp: number;
    /** Last accessed timestamp for session freshness */
    lastAccessed: number;
    /** Parsed and validated contact records */
    parsedData: ContactRecord[];
    /** Total number of records in original file */
    totalRecords: number;
    /** Number of valid records after validation */
    validRecords: number;
    /** Number of invalid records */
    invalidRecords: number;
    /** Current processing state */
    processingStatus: 'uploaded' | 'processing' | 'processed' | 'error';
    /** Maps Excel column headers to app field names */
    columnMapping: Record<string, string>;
    /** First few rows for UI preview */
    previewData: Array<ExcelRow>;
    /** Whether session is currently active */
    isActive: boolean;
    /** Error message if processingStatus is 'error' */
    errorMessage?: string;
}

/**
 * Represents a single contact record from Excel import.
 * Includes validation status and any errors.
 */
export interface ContactRecord {
    /** Unique identifier for the record */
    id: string;
    /** Normalized phone number */
    phoneNumber: string;
    /** Contact name (optional) */
    name?: string;
    /** Amount field for payment reminders */
    amount?: number;
    /** Any additional columns from Excel */
    customFields?: Record<string, unknown>;
    /** Validation status */
    status: 'pending' | 'valid' | 'invalid';
    /** List of validation errors if status is 'invalid' */
    validationErrors?: string[];
}

/**
 * Extended upload data stored in history
 */
export interface UploadHistoryEntry extends ExcelUploadData {
    /** Whether this upload was completed (messages sent) */
    completed: boolean;
    /** Whether archived by user */
    archived: boolean;
    /** Timestamp when completed */
    completedAt?: number;
    /** Number of messages successfully sent */
    sentCount?: number;
    /** Number of messages failed */
    failedCount?: number;
}

/**
 * User preferences for upload persistence
 */
export interface UploadPersistencePreferences {
    /** Enable auto-save of uploads */
    autoSave: boolean;
    /** Session timeout in hours */
    sessionTimeout: number;
    /** Keep upload history */
    keepHistory: boolean;
    /** Max history entries to keep */
    maxHistoryEntries: number;
}

/**
 * Result from contact processing
 */
export interface ProcessContactsResult {
    /** Valid contacts ready for sending */
    validContacts: ContactRecord[];
    /** Invalid contacts with errors */
    invalidContacts: ContactRecord[];
    /** Detected column mapping */
    columnMapping: Record<string, string>;
}

/**
 * SMS Queue Configuration
 */
export interface SmsQueueConfig {
    timeout: number;
    maxRetries: number;
    batchSize: number;
    streamingThreshold: number;
    flushInterval: number;
}

/**
 * Result from processing a single message
 */
export interface ProcessingResult {
    success: boolean;
    error?: string;
    queued?: boolean;
}

/**
 * Progressive timeout configuration for retries
 */
export interface TimeoutConfig {
    baseTimeout: number;
    retryTimeouts: number[];
}

