// Test file for StartupErrorManager
import { calculateBackoffDelay, shouldRetry, checkOfflineMode, handleStartupError, executeWithRetry } from '@/services/StartupErrorManager';
import { AppError, AppErrorType } from '@/utils/errors/AppErrors';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@/services/errorTracking', () => ({
    errorTracking: {
        addBreadcrumb: jest.fn(),
        reportError: jest.fn(),
        initialize: jest.fn().mockResolvedValue(undefined),
    },
}));
jest.mock('@/utils/logger', () => ({
    default: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('StartupErrorManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateBackoffDelay', () => {
        it('should calculate exponential backoff correctly', () => {
            expect(calculateBackoffDelay(1)).toBe(1000); // 1s
            expect(calculateBackoffDelay(2)).toBe(2000); // 2s
            expect(calculateBackoffDelay(3)).toBe(4000); // 4s
            expect(calculateBackoffDelay(4)).toBe(8000); // 8s
            expect(calculateBackoffDelay(5)).toBe(16000); // 16s
        });

        it('should cap at maximum delay', () => {
            expect(calculateBackoffDelay(10)).toBe(30000); // 30s max
            expect(calculateBackoffDelay(20)).toBe(30000); // 30s max
        });
    });

    describe('shouldRetry', () => {
        it('should retry retriable errors within max attempts', () => {
            const error: AppError = {
                type: AppErrorType.NETWORK_TIMEOUT,
                message: 'Timeout',
                timestamp: Date.now(),
                severity: 'MEDIUM',
                retriable: true,
            };

            expect(shouldRetry(error, 1)).toBe(true);
            expect(shouldRetry(error, 3)).toBe(true);
        });

        it('should not retry non-retriable errors', () => {
            const error: AppError = {
                type: AppErrorType.PERMISSION_DENIED,
                message: 'Permission denied',
                timestamp: Date.now(),
                severity: 'HIGH',
                retriable: false,
            };

            expect(shouldRetry(error, 1)).toBe(false);
        });

        it('should not retry after max attempts', () => {
            const error: AppError = {
                type: AppErrorType.NETWORK_TIMEOUT,
                message: 'Timeout',
                timestamp: Date.now(),
                severity: 'MEDIUM',
                retriable: true,
            };

            expect(shouldRetry(error, 5)).toBe(false); // max is 5
            expect(shouldRetry(error, 6)).toBe(false);
        });
    });

    describe('checkOfflineMode', () => {
        it('should return true when offline', async () => {
            (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

            const result = await checkOfflineMode();
            expect(result).toBe(true);
        });

        it('should return false when online', async () => {
            (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

            const result = await checkOfflineMode();
            expect(result).toBe(false);
        });

        it('should default to online if check fails', async () => {
            (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('NetInfo error'));

            const result = await checkOfflineMode();
            expect(result).toBe(false);
        });
    });

    describe('executeWithRetry', () => {
        it('should succeed on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('success');

            const result = await executeWithRetry(operation, 'test_operation');

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and eventually succeed', async () => {
            // Mock a network timeout error (retriable) then success
            const error = new Error('Network timeout');
            (error as any).code = 'ETIMEDOUT'; // Mark as retriable network error
            
            const operation = jest
                .fn()
                .mockRejectedValueOnce(error)
                .mockResolvedValue('success');

            const onRetry = jest.fn();

            const result = await executeWithRetry(operation, 'test_operation', onRetry);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it('should throw after max retries', async () => {
            // Create a retriable error so it will retry
            const error = new Error('Network timeout');
            (error as any).code = 'ETIMEDOUT'; // Mark as retriable network error
            
            const operation = jest.fn().mockRejectedValue(error);

            const result = executeWithRetry(operation, 'test_operation');
            
            // Should throw an AppError after max retries (5 times)
            await expect(result).rejects.toMatchObject({
                message: 'Network timeout'
            });
            expect(operation).toHaveBeenCalledTimes(5); // max retries
        });

        it.skip('should timeout long operations', async () => {
            const operation = jest.fn().mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            const result = executeWithRetry(operation, 'test_operation');
            await expect(result).rejects.toThrow('Startup timeout: test_operation took longer than 60000ms');
        }, 65000); // Extend Jest timeout beyond the 60s startup timeout
    });
});
