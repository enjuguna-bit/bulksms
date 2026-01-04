// Test file for startup validation utilities
import {
    validateTimestamp,
    validateDatabaseSchema,
    validateMessagesTable,
    checkDataIntegrity,
    validateMigrationState,
    runStartupValidations,
} from '@/utils/startupValidation';
import { runQuery } from '@/db/database';
import { getDatabase } from '@/db/database/core';

// Mock dependencies
jest.mock('@/db/database');
jest.mock('@/db/database/core');
jest.mock('@/utils/logger', () => ({
    default: Object.assign(jest.fn(), {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }),
}));

const mockRunQuery = runQuery as jest.MockedFunction<typeof runQuery>;
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Startup Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateTimestamp', () => {
        it('should return valid timestamps unchanged', () => {
            const now = Date.now();
            expect(validateTimestamp(now)).toBe(now);
        });

        it('should handle string timestamps', () => {
            const now = Date.now();
            expect(validateTimestamp(now.toString())).toBe(now);
        });

        it('should convert seconds to milliseconds', () => {
            const secondsTs = 1700000000; // 2023 in seconds
            const result = validateTimestamp(secondsTs);
            expect(result).toBe(secondsTs * 1000);
        });

        it('should return current time for null/undefined', () => {
            const before = Date.now();
            const result = validateTimestamp(null);
            const after = Date.now();
            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(after);
        });

        it('should return current time for negative timestamps', () => {
            const before = Date.now();
            const result = validateTimestamp(-1000);
            const after = Date.now();
            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(after);
        });

        it('should return current time for far future timestamps', () => {
            const farFuture = Date.now() + (2 * 365 * 24 * 60 * 60 * 1000); // 2 years
            const before = Date.now();
            const result = validateTimestamp(farFuture);
            const after = Date.now();
            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(after);
        });

        it('should return current time for NaN', () => {
            const before = Date.now();
            const result = validateTimestamp(NaN);
            const after = Date.now();
            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(after);
        });
    });

    describe('validateDatabaseSchema', () => {
        it('should validate all required tables exist', async () => {
            // Mock successful queries for all tables
            mockRunQuery.mockResolvedValue({
                rows: { length: 1 },
            } as any);

            const result = await validateDatabaseSchema();

            expect(result.valid).toBe(true);
            expect(result.missingTables).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing tables', async () => {
            // Mock missing 'messages' table
            mockRunQuery.mockImplementation(async (sql, params) => {
                if (params?.[0] === 'messages') {
                    return { rows: { length: 0 } } as any;
                }
                return { rows: { length: 1 } } as any;
            });

            const result = await validateDatabaseSchema();

            expect(result.valid).toBe(false);
            expect(result.missingTables).toContain('messages');
        });

        it('should handle query errors', async () => {
            mockRunQuery.mockRejectedValue(new Error('Database error'));

            const result = await validateDatabaseSchema();

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('validateMessagesTable', () => {
        it('should validate all required columns exist', async () => {
            mockRunQuery.mockResolvedValue({
                rows: {
                    raw: () => [
                        { name: 'id' },
                        { name: 'address' },
                        { name: 'body' },
                        { name: 'type' },
                        { name: 'status' },
                        { name: 'timestamp' },
                        { name: 'simSlot' },
                        { name: 'threadId' },
                        { name: 'isRead' },
                        { name: 'isArchived' },
                    ],
                },
            } as any);

            const result = await validateMessagesTable();

            expect(result.valid).toBe(true);
            expect(result.missingColumns).toHaveLength(0);
        });

        it('should detect missing columns', async () => {
            mockRunQuery.mockResolvedValue({
                rows: {
                    raw: () => [
                        { name: 'id' },
                        { name: 'address' },
                        { name: 'body' },
                        // Missing other columns
                    ],
                },
            } as any);

            const result = await validateMessagesTable();

            expect(result.valid).toBe(false);
            expect(result.missingColumns.length).toBeGreaterThan(0);
        });
    });

    describe('checkDataIntegrity', () => {
        it('should pass when database is healthy', async () => {
            // Mock integrity check passing
            mockRunQuery
                .mockResolvedValueOnce({
                    rows: { raw: () => [{ integrity_check: 'ok' }] },
                } as any)
                // Mock no invalid timestamps
                .mockResolvedValueOnce({
                    rows: { item: () => ({ count: 0 }) },
                } as any);

            const result = await checkDataIntegrity();

            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should detect integrity issues', async () => {
            // Mock integrity check failing
            mockRunQuery
                .mockResolvedValueOnce({
                    rows: { raw: () => [{ integrity_check: 'corrupted' }] },
                } as any)
                .mockResolvedValueOnce({
                    rows: { item: () => ({ count: 0 }) },
                } as any);

            const result = await checkDataIntegrity();

            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });

        it('should detect invalid timestamps', async () => {
            mockRunQuery
                .mockResolvedValueOnce({
                    rows: { raw: () => [{ integrity_check: 'ok' }] },
                } as any)
                // Mock 5 invalid timestamps
                .mockResolvedValueOnce({
                    rows: { item: () => ({ count: 5 }) },
                } as any);

            const result = await checkDataIntegrity();

            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });
    });

    describe('runStartupValidations', () => {
        it('should run all validations and aggregate results', async () => {
            // Mock all validations passing - need to account for all runQuery calls
            // validateDatabaseSchema: 6 calls (one per required table)
            // validateMessagesTable: 1 call
            // checkDataIntegrity: 2 calls (integrity_check + invalid timestamps)
            // validateMigrationState calls validateDatabaseSchema and validateMessagesTable again (6+1 calls)
            // validateDatabasePerformance: needs getDatabase mock
            
            mockRunQuery
                // validateDatabaseSchema - 6 calls for each table
                .mockResolvedValueOnce({ rows: { length: 1 } } as any) // messages
                .mockResolvedValueOnce({ rows: { length: 1 } } as any) // payment_records
                .mockResolvedValueOnce({ rows: { length: 1 } } as any) // sms_queue
                .mockResolvedValueOnce({ rows: { length: 1 } } as any) // send_logs
                .mockResolvedValueOnce({ rows: { length: 1 } } as any) // incoming_sms_buffer
                .mockResolvedValueOnce({ rows: { length: 1 } } as any) // audit_log
                // validateMessagesTable
                .mockResolvedValueOnce({
                    rows: {
                        raw: () => [
                            { name: 'id' },
                            { name: 'address' },
                            { name: 'body' },
                            { name: 'type' },
                            { name: 'status' },
                            { name: 'timestamp' },
                            { name: 'simSlot' },
                            { name: 'threadId' },
                            { name: 'isRead' },
                            { name: 'isArchived' },
                        ],
                    },
                } as any)
                // checkDataIntegrity - integrity_check
                .mockResolvedValueOnce({
                    rows: { raw: () => [{ integrity_check: 'ok' }] },
                } as any)
                // checkDataIntegrity - invalid timestamps
                .mockResolvedValueOnce({
                    rows: { item: () => ({ count: 0 }) },
                } as any)
                // validateMigrationState calls validateDatabaseSchema again - 6 more calls
                .mockResolvedValueOnce({ rows: { length: 1 } } as any)
                .mockResolvedValueOnce({ rows: { length: 1 } } as any)
                .mockResolvedValueOnce({ rows: { length: 1 } } as any)
                .mockResolvedValueOnce({ rows: { length: 1 } } as any)
                .mockResolvedValueOnce({ rows: { length: 1 } } as any)
                .mockResolvedValueOnce({ rows: { length: 1 } } as any)
                // validateMigrationState calls validateMessagesTable again
                .mockResolvedValueOnce({
                    rows: {
                        raw: () => [
                            { name: 'id' },
                            { name: 'address' },
                            { name: 'body' },
                            { name: 'type' },
                            { name: 'status' },
                            { name: 'timestamp' },
                            { name: 'simSlot' },
                            { name: 'threadId' },
                            { name: 'isRead' },
                            { name: 'isArchived' },
                        ],
                    },
                } as any);

            mockGetDatabase.mockResolvedValue({} as any);

            const result = await runStartupValidations();

            expect(result.valid).toBe(true);
            expect(result.results.schema.valid).toBe(true);
            expect(result.results.messages.valid).toBe(true);
            expect(result.results.integrity.valid).toBe(true);
        });
    });
});
