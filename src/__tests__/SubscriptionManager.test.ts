import { subscriptionManager } from '../services/billing/SubscriptionManager';
import { SecureStorageService } from '@/services/SecureStorageService';
import { DeviceBindingService } from '@/services/DeviceBindingService';
import { getPlanByAmount } from '../services/billing/SubscriptionPlans';
import { getBypassStatus } from '@/services/devBypass';

// Mock dependencies
jest.mock('@/services/SecureStorageService');
jest.mock('@/services/DeviceBindingService');
jest.mock('../services/billing/SubscriptionPlans', () => {
  return {
    ...jest.requireActual('../services/billing/SubscriptionPlans'),
    getPlanByAmount: jest.fn(),
  };
});
jest.mock('@/services/devBypass');

const mockSecureStorage = SecureStorageService as jest.Mocked<typeof SecureStorageService>;
const mockDeviceBinding = DeviceBindingService as jest.Mocked<typeof DeviceBindingService>;
const mockGetPlanByAmount = getPlanByAmount as jest.Mock;
const mockGetBypassStatus = getBypassStatus as jest.Mock;

describe('SubscriptionManager', () => {
  beforeEach(() => {
    mockSecureStorage.getItem.mockResolvedValue(null);
    mockDeviceBinding.getFingerprint.mockResolvedValue('device-fingerprint');
    mockDeviceBinding.getTrialStatus.mockResolvedValue({ used: false, startTime: undefined });
    mockDeviceBinding.canStartTrial.mockResolvedValue({ allowed: true });
    mockGetPlanByAmount.mockReturnValue({ id: 'monthly', name: 'Monthly' });
    mockGetBypassStatus.mockResolvedValue({ active: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasActiveAccess', () => {
    it('returns true for active subscription', async () => {
      mockSecureStorage.getItem.mockResolvedValueOnce(JSON.stringify({
        expiryAt: Date.now() + 86400000, // 1 day in future
      }));

      const result = await subscriptionManager.hasActiveAccess();
      expect(result).toBe(true);
    });

    it('returns false for expired subscription', async () => {
      mockSecureStorage.getItem.mockResolvedValueOnce(JSON.stringify({
        expiryAt: Date.now() - 86400000, // 1 day in past
      }));

      // Ensure trial is also expired/used
      mockDeviceBinding.getTrialStatus.mockResolvedValueOnce({
        used: true,
        startTime: Date.now() - (30 * 24 * 60 * 60 * 1000)
      });

      const result = await subscriptionManager.hasActiveAccess();
      expect(result).toBe(false);
    });

    it('returns true when admin bypass is active', async () => {
      mockGetBypassStatus.mockResolvedValue({ active: true, source: 'admin' });
      const result = await subscriptionManager.hasActiveAccess();
      expect(result).toBe(true);
    });

    it('returns true during trial period', async () => {
      mockDeviceBinding.getTrialStatus.mockResolvedValue({
        used: true,
        startTime: Date.now() - 10000 // Recently started
      });
      const result = await subscriptionManager.hasActiveAccess();
      expect(result).toBe(true);
    });

    it('handles subscription verification errors', async () => {
      mockSecureStorage.getItem.mockRejectedValue(new Error('Storage error'));

      // Ensure trial is also NOT active (fail safe)
      mockDeviceBinding.getTrialStatus.mockResolvedValueOnce({
        used: true,
        startTime: Date.now() - (30 * 24 * 60 * 60 * 1000)
      });

      const result = await subscriptionManager.hasActiveAccess();
      expect(result).toBe(false);
    });
  });

  describe('activateFromPayment', () => {
    it('creates new subscription for first-time user', async () => {
      // Ensure getPlanByAmount returns a valid plan
      mockGetPlanByAmount.mockReturnValue({ id: 'monthly', name: 'Monthly' });

      const result = await subscriptionManager.activateFromPayment(
        1000,
        'MPESA12345',
        'mpesa'
      );

      if (!result.success) {
        console.log('Activation failed with:', result.error);
      }

      expect(result.success).toBe(true);
      expect(mockSecureStorage.setItem).toHaveBeenCalled();
    });

    it('extends existing subscription', async () => {
      const activeExpiry = Date.now() + 86400000; // 1 day remaining
      jest.spyOn(subscriptionManager, 'getSubscription').mockResolvedValueOnce({
        id: 'sub_123',
        planId: 'monthly',
        amount: 1000,
        activatedAt: Date.now() - 100000,
        expiryAt: activeExpiry,
        source: 'mpesa',
        deviceFingerprint: 'device-fingerprint',
      });

      mockGetPlanByAmount.mockReturnValue({ id: 'monthly', name: 'Monthly' });

      const result = await subscriptionManager.activateFromPayment(
        1000,
        'MPESA12345',
        'mpesa'
      );

      if (!result.success) {
        console.log('Activation failed with:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.subscription?.extendedFrom).toBeDefined();
      expect(result.subscription?.extendedFrom).toBe(activeExpiry);
    });
  });
});
