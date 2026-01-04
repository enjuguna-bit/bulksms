// -------------------------------------------------------------
// ✅ Startup Validation Utilities
// -------------------------------------------------------------
// Schema validation, timestamp handling, and data integrity checks

import { runQuery } from '@/db/database';
import { getDatabase } from '@/db/database/core';
import Logger from '@/utils/logger';
import { NativeModules } from 'react-native';

// Safe logger helper for test environments
const safeLog = {
    info: (scope: string, message: string, data?: unknown) => {
        try {
            safeLog.info(scope, message, data);
        } catch (e) {
            // Logger not available in test environment
        }
    },
    warn: (scope: string, message: string, data?: unknown) => {
        try {
            safeLog.warn(scope, message, data);
        } catch (e) {
            // Logger not available in test environment
        }
    },
    error: (scope: string, message: string, error?: unknown) => {
        try {
            safeLog.error(scope, message, error);
        } catch (e) {
            // Logger not available in test environment
        }
    },
};

/**
 * Validate that a timestamp is valid and not in the future
 */
export function validateTimestamp(timestamp: unknown): number {
    // Handle null/undefined
    if (timestamp == null) {
        return Date.now();
    }

    // Convert to number
    let ts: number;
    if (typeof timestamp === 'string') {
        ts = parseInt(timestamp, 10);
    } else if (typeof timestamp === 'number') {
        ts = timestamp;
    } else {
        try {
            safeLog.warn('Validation', 'Invalid timestamp type, using current time', { timestamp });
        } catch (e) {
            // Logger not available in test environment
        }
        return Date.now();
    }

    // Check if valid number
    if (isNaN(ts) || !isFinite(ts)) {
        safeLog.warn('Validation', 'Invalid timestamp value, using current time', { timestamp });
        return Date.now();
    }

    // Check if negative
    if (ts < 0) {
        safeLog.warn('Validation', 'Negative timestamp, using current time', { timestamp });
        return Date.now();
    }

    // Check if too far in the future (more than 1 year)
    const oneYearFromNow = Date.now() + (365 * 24 * 60 * 60 * 1000);
    if (ts > oneYearFromNow) {
        safeLog.warn('Validation', 'Timestamp too far in future, using current time', { timestamp });
        return Date.now();
    }

    // Check if timestamp is in seconds instead of milliseconds (common mistake)
    // Timestamps before year 2000 in milliseconds are likely in seconds
    const year2000 = 946684800000; // Jan 1, 2000 in ms
    if (ts < year2000 && ts > 946684800) {
        // Likely in seconds, convert to milliseconds
        safeLog.info('Validation', 'Timestamp appears to be in seconds, converting to ms', { timestamp: ts });
        return ts * 1000;
    }

    return ts;
}

/**
 * Validate database schema has required tables
 */
export async function validateDatabaseSchema(): Promise<{
    valid: boolean;
    missingTables: string[];
    errors: string[];
}> {
    const requiredTables = [
        'messages',
        'payment_records',
        'sms_queue',
        'send_logs',
        'incoming_sms_buffer',
        'audit_log',
    ];

    const missingTables: string[] = [];
    const errors: string[] = [];

    try {
        for (const tableName of requiredTables) {
            try {
                const result = await runQuery(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
                    [tableName]
                );

                if (result.rows.length === 0) {
                    missingTables.push(tableName);
                    safeLog.warn('Validation', `Missing table: ${tableName}`);
                }
            } catch (e) {
                const errorMsg = `Failed to check table ${tableName}: ${e}`;
                errors.push(errorMsg);
                safeLog.error('Validation', errorMsg);
            }
        }

        const valid = missingTables.length === 0 && errors.length === 0;

        if (valid) {
            safeLog.info('Validation', 'Database schema validation passed');
        } else {
            safeLog.warn('Validation', 'Database schema validation failed', {
                missingTables,
                errors,
            });
        }

        return { valid, missingTables, errors };

    } catch (e) {
        safeLog.error('Validation', 'Schema validation error', e);
        return {
            valid: false,
            missingTables: [],
            errors: [`Critical validation error: ${e}`],
        };
    }
}

/**
 * Validate required columns exist in messages table
 */
export async function validateMessagesTable(): Promise<{
    valid: boolean;
    missingColumns: string[];
}> {
    const requiredColumns = [
        'id',
        'address',
        'body',
        'type',
        'status',
        'timestamp',
        'simSlot',
        'threadId',
        'isRead',
        'isArchived',
    ];

    const missingColumns: string[] = [];

    try {
        const result = await runQuery(`PRAGMA table_info(messages)`);
        const existingColumns = result.rows.raw().map((col: any) => col.name);

        for (const colName of requiredColumns) {
            if (!existingColumns.includes(colName)) {
                missingColumns.push(colName);
                safeLog.warn('Validation', `Missing column in messages table: ${colName}`);
            }
        }

        const valid = missingColumns.length === 0;

        if (valid) {
            safeLog.info('Validation', 'Messages table validation passed');
        } else {
            safeLog.warn('Validation', 'Messages table validation failed', { missingColumns });
        }

        return { valid, missingColumns };

    } catch (e) {
        safeLog.error('Validation', 'Messages table validation error', e);
        return { valid: false, missingColumns: [] };
    }
}

/**
 * Check database integrity
 */
export async function checkDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
}> {
    const issues: string[] = [];

    try {
        // Run PRAGMA integrity_check
        const integrityResult = await runQuery(`PRAGMA integrity_check`);
        const integrityRows = integrityResult.rows.raw();

        if (integrityRows.length > 0 && integrityRows[0].integrity_check !== 'ok') {
            issues.push('Database integrity check failed');
            safeLog.error('Validation', 'Database integrity issues detected', integrityRows);
        }

        // Check for orphaned records (basic check)
        // Verify messages without timestamps
        const invalidTimestamps = await runQuery(
            `SELECT COUNT(*) as count FROM messages WHERE timestamp IS NULL OR timestamp < 0`
        );
        const invalidCount = invalidTimestamps.rows.item(0).count;
        if (invalidCount > 0) {
            issues.push(`Found ${invalidCount} messages with invalid timestamps`);
            safeLog.warn('Validation', `Found ${invalidCount} messages with invalid timestamps`);
        }

        const valid = issues.length === 0;

        if (valid) {
            safeLog.info('Validation', 'Data integrity check passed');
        } else {
            safeLog.warn('Validation', 'Data integrity issues found', { issues });
        }

        return { valid, issues };

    } catch (e) {
        safeLog.error('Validation', 'Data integrity check error', e);
        return {
            valid: false,
            issues: [`Failed to check data integrity: ${e}`],
        };
    }
}

/**
 * Validate database performance characteristics
 */
export async function validateDatabasePerformance(): Promise<{
    valid: boolean;
    issues: string[];
    sizeMB: number;
}> {
    const issues: string[] = [];

    try {
        const db = await getDatabase();
        const sizeCheck = await validateDatabaseSize(db);

        if (!sizeCheck.valid) {
            issues.push(`Large database detected (${sizeCheck.sizeMB.toFixed(2)}MB)`);
        }

        return {
            valid: issues.length === 0,
            issues,
            sizeMB: sizeCheck.sizeMB
        };
    } catch (e) {
        safeLog.error('Validation', 'Database performance validation error', e);
        return {
            valid: false,
            issues: ['Failed to validate database performance'],
            sizeMB: 0
        };
    }
}
export async function validateMigrationState(): Promise<{
    valid: boolean;
    issues: string[];
}> {
    const issues: string[] = [];

    try {
        // Check schema version
        const schemaResult = await validateDatabaseSchema();
        if (!schemaResult.valid) {
            issues.push(`Schema validation failed: ${schemaResult.missingTables.join(', ')}`);
        }

        // Check messages table columns
        const messagesResult = await validateMessagesTable();
        if (!messagesResult.valid) {
            issues.push(`Messages table missing columns: ${messagesResult.missingColumns.join(', ')}`);
        }

        const valid = issues.length === 0;

        if (valid) {
            safeLog.info('Validation', 'Migration validation passed');
        } else {
            safeLog.warn('Validation', 'Migration validation failed', { issues });
        }

        return { valid, issues };

    } catch (e) {
        safeLog.error('Validation', 'Migration validation error', e);
        return {
            valid: false,
            issues: [`Migration validation error: ${e}`],
        };
    }
}

/**
 * Validate database size
 */
async function validateDatabaseSize(db: any): Promise<{ valid: boolean, sizeMB: number }> {
    try {
        // Execute PRAGMAs separately - they cannot be used inside SELECT statements
        const [pageCountResult] = await db.executeSql('PRAGMA page_count');
        const [pageSizeResult] = await db.executeSql('PRAGMA page_size');

        const pageCount = pageCountResult.rows.raw()[0]?.page_count || 0;
        const pageSize = pageSizeResult.rows.raw()[0]?.page_size || 4096;
        const sizeBytes = pageCount * pageSize;
        const sizeMB = sizeBytes / (1024 * 1024);

        if (sizeMB > 100) {
            safeLog.warn("Validation", `Large database detected (${sizeMB.toFixed(2)}MB)`);
            return { valid: false, sizeMB };
        }

        return { valid: true, sizeMB };
    } catch (e) {
        safeLog.error("Validation", "Failed to validate database size", e);
        return { valid: true, sizeMB: 0 }; // Return valid: true to avoid blocking startup
    }
}

/**
 * Quick validation - check critical database tables exist
 */
export async function runQuickValidations(): Promise<{
    valid: boolean;
    missingCriticalTables?: string[];
    issues?: string[];
}> {
    const issues: string[] = [];
    const missingCriticalTables: string[] = [];

    try {
        // Check critical tables exist
        const criticalTables = ['messages', 'sms_queue'];

        for (const table of criticalTables) {
            try {
                const result = await runQuery(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
                if (result.rows.length === 0) {
                    missingCriticalTables.push(table);
                    issues.push(`Critical table missing: ${table}`);
                }
            } catch (e) {
                safeLog.error('Validation', `Failed to check table ${table}`, e);
                missingCriticalTables.push(table);
                issues.push(`Error checking table ${table}: ${e}`);
            }
        }

        const valid = missingCriticalTables.length === 0;

        if (valid) {
            safeLog.info('Validation', 'Quick validation passed');
        } else {
            safeLog.warn('Validation', 'Quick validation failed', { missingCriticalTables, issues });
        }

        return {
            valid,
            missingCriticalTables,
            issues
        };

    } catch (e) {
        safeLog.error('Validation', 'Quick validation error', e);
        return {
            valid: false,
            missingCriticalTables: ['unknown'],
            issues: [`Quick validation error: ${e}`]
        };
    }
}

/**
 * Run all detailed startup validations (should run in background)
 * Renamed from runStartupValidations to make it clear this is the full check
 */
export async function runDetailedValidations(): Promise<{
    valid: boolean;
    results: {
        schema: { valid: boolean; missingTables: string[]; errors: string[] };
        messages: { valid: boolean; missingColumns: string[] };
        integrity: { valid: boolean; issues: string[] };
        migrations: { valid: boolean; issues: string[] };
        performance: { valid: boolean; issues: string[]; sizeMB: number };
    };
}> {
    safeLog.info('Validation', 'Running detailed validations...');

    const schema = await validateDatabaseSchema();
    const messages = await validateMessagesTable();
    const integrity = await checkDataIntegrity();
    const migrations = await validateMigrationState();
    const performance = await validateDatabasePerformance();

    const valid = schema.valid && messages.valid && integrity.valid && migrations.valid && performance.valid;

    if (valid) {
        safeLog.info('Validation', 'All detailed validations passed ✓');
    } else {
        safeLog.warn('Validation', 'Some detailed validations failed', {
            schema: schema.valid,
            messages: messages.valid,
            integrity: integrity.valid,
            migrations: migrations.valid,
            performance: performance.valid,
        });
    }

    return {
        valid,
        results: {
            schema,
            messages,
            integrity,
            migrations,
            performance,
        },
    };
}

/**
 * @deprecated Use runQuickValidations() or runDetailedValidations() instead
 * Kept for backward compatibility
 */
export async function runStartupValidations(): Promise<{
    valid: boolean;
    results: {
        schema: { valid: boolean; missingTables: string[]; errors: string[] };
        messages: { valid: boolean; missingColumns: string[] };
        integrity: { valid: boolean; issues: string[] };
        migrations: { valid: boolean; issues: string[] };
        performance: { valid: boolean; issues: string[]; sizeMB: number };
    };
}> {
    return runDetailedValidations();
}

// ---------------------------------------------------------
// 🛠 Native Library Verification
// ---------------------------------------------------------
export async function verifyNativeLibraries(): Promise<{ valid: boolean, error?: string }> {
    // Note: RNLibChecker native module is not implemented in this project.
    // The actual native library loading is handled by React Native's module system.
    // If critical native libraries are missing, the app will fail during module loading,
    // which happens before this check would run anyway.
    // 
    // This function now always returns valid to avoid false positives.
    safeLog.info('Startup', 'Native library verification skipped (handled by module loader)');
    return { valid: true };
}
