
import { syncMessageFromNative } from '../repository';
import { runQuery } from '../../database/core';

// Mock dependencies
jest.mock('../../database/core', () => ({
    runQuery: jest.fn(),
    executeTransaction: jest.fn(),
}));

jest.mock('../schema', () => ({
    MESSAGING_SCHEMA: { conversations: '', conversationMessages: '', indexes: [] },
}));

// Helpers for mocking SQLite results
const mockResultSet = (rows: any[]) => ({
    rows: {
        length: rows.length,
        raw: () => rows,
        item: (i: number) => rows[i],
    },
    insertId: 123,
    rowsAffected: 1,
});

describe('syncMessageFromNative Idempotency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (runQuery as jest.Mock).mockResolvedValue(mockResultSet([]));
    });

    it('should insert message if it does not exist', async () => {
        // 1. Mock Schema Init
        // 2. Mock getOrCreateConversation -> returns conversation with ID 1
        // 3. Mock Check Existing -> returns empty
        // 4. Mock Insert -> returns ID 100

        (runQuery as jest.Mock)
            // Schema init calls (ignored/resolved default)
            .mockResolvedValueOnce(mockResultSet([])) // Schema 1
            .mockResolvedValueOnce(mockResultSet([])) // Schema 2

            // getConversationByAddress (check existing conv)
            .mockResolvedValueOnce(mockResultSet([{
                id: 1,
                recipient_number: '1234567890',
                recipient_name: 'Test',
                unread_count: 0
            }]))

            // Check Existing Message (Idempotency Check)
            .mockResolvedValueOnce(mockResultSet([]))

            // Insert Message
            .mockResolvedValueOnce(mockResultSet([]));

        const result = await syncMessageFromNative(
            '1234567890',
            'Hello World',
            'incoming',
            1000
        );

        expect(runQuery).toHaveBeenCalledTimes(7); // Updated: implementation now makes 7 queries
        // Verify the Idempotency Check query was called
        const checkCall = (runQuery as jest.Mock).mock.calls.find(call =>
            call[0].includes('SELECT * FROM conversation_messages') &&
            call[0].includes('timestamp = ?')
        );
        expect(checkCall).toBeTruthy();
        expect(checkCall[1]).toContain(1000); // Timestamp check
    });

    it('should NOT insert message if it already exists', async () => {
        (runQuery as jest.Mock)
            // getConversationByAddress
            .mockResolvedValueOnce(mockResultSet([{ id: 1, recipient_number: '1234567890' }]))

            // Check Existing Message -> RETURNS MATCH
            .mockResolvedValueOnce(mockResultSet([{
                id: 99,
                conversation_id: 1,
                body: 'Hello World',
                timestamp: 1000,
                direction: 'incoming',
                type: 'sms'
            }]));

        const result = await syncMessageFromNative(
            '1234567890',
            'Hello World',
            'incoming',
            1000
        );

        // Should return existing message
        expect(result.message.id).toBe(99);

        // Should NOT verify call to Insert Message
        const insertCall = (runQuery as jest.Mock).mock.calls.find(call =>
            call[0].includes('INSERT INTO conversation_messages')
        );
        expect(insertCall).toBeUndefined();
    });
});
