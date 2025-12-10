// src/__tests__/QueueTest.test.ts
import { processSMSQueue } from '../background/smsWatcher';
import { smsSender } from '@/native';
import { getPendingMessages } from '@/db/repositories/smsQueue';

// Mock the dependencies
jest.mock('@/native', () => ({
    smsSender: {
        send: jest.fn()
    }
}));

jest.mock('@/db/repositories/smsQueue', () => ({
    getPendingMessages: jest.fn(),
    removeMessage: jest.fn(),
    markMessageFailed: jest.fn(),
    enqueueMessage: jest.fn()
}));

describe('SMS Queue Logic', () => {
    it('should remove message ONLY if native send returns success (true)', async () => {
        // Setup
        const mockMsg = { id: 101, to_number: '123', body: 'test', timestamp: 123 };
        (getPendingMessages as jest.Mock).mockResolvedValue([mockMsg]);

        // Mock Wrapper Success (boolean)
        // Note: smsSender.send returns Promise<boolean> in the actual implementation.
        (smsSender.send as jest.Mock).mockResolvedValue(true);

        // Execute
        const count = await processSMSQueue();

        // Verify
        expect(count).toBe(1);
        expect(require('@/db/repositories/smsQueue').removeMessage).toHaveBeenCalledWith(101);
    });

    it('should NOT remove message if native send returns failure (false)', async () => {
        // Setup
        const mockMsg = { id: 102, to_number: '123', body: 'fail', timestamp: 123 };
        (getPendingMessages as jest.Mock).mockResolvedValue([mockMsg]);

        // Mock Wrapper Failure (boolean)
        // Note: If this returned an object {success: false}, it would be truthy and fail the test!
        // Since we fixed the wrapper to return boolean, we mock boolean here.
        (smsSender.send as jest.Mock).mockResolvedValue(false);

        // Execute
        const count = await processSMSQueue();

        // Verify
        expect(count).toBe(0);
        expect(require('@/db/repositories/smsQueue').removeMessage).not.toHaveBeenCalled();
        expect(require('@/db/repositories/smsQueue').markMessageFailed).toHaveBeenCalledWith(102);
    });
});
