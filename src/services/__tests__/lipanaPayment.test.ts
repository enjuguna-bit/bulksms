import { createLipanaPaymentLink } from '../lipanaPayment';

// Mock the SDK
const mockCreate = jest.fn();
jest.mock('@lipana/sdk', () => {
  return {
    Lipana: jest.fn().mockImplementation(() => ({
      paymentLinks: {
        create: mockCreate,
      },
    })),
  };
});

describe('Lipana Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create payment link successfully', async () => {
    mockCreate.mockResolvedValueOnce({
      payment_url: 'https://lipana.dev/pay/test-123',
      id: 'test-123',
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
    mockCreate.mockRejectedValueOnce(new Error('Invalid API key'));

    const result = await createLipanaPaymentLink({
      title: 'Test Payment',
      amount: 3900,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });
});
