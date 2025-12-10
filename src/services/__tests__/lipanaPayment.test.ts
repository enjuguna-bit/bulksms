// -----------------------------------------------------
// src/services/__tests__/lipanaPayment.test.ts
// Test file for Lipana payment service
// -----------------------------------------------------

import { createLipanaPaymentLink } from '../lipanaPayment';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Lipana Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create payment link successfully', async () => {
    const mockResponse = {
      payment_url: 'https://lipana.dev/pay/test-123',
      id: 'test-123',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await createLipanaPaymentLink({
      title: 'Test Payment',
      amount: 3900,
      currency: 'KES',
    });

    expect(result.success).toBe(true);
    expect(result.paymentLink).toBe('https://lipana.dev/pay/test-123');
    expect(result.transactionId).toBe('test-123');
  });

  test('should handle API errors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid API key' }),
    });

    const result = await createLipanaPaymentLink({
      title: 'Test Payment',
      amount: 3900,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });
});
