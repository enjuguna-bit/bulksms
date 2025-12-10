// -----------------------------------------------------
// src/services/lipanaPayment.ts
// Lipana API integration for M-PESA STK Push payments
// -----------------------------------------------------

import { LIPANA_API } from "@/constants/mpesa";

export interface LipanaPaymentRequest {
  title: string;
  amount: number;
  currency?: string; // Defaults to KES
  phone?: string;   // Optional phone for pre-fill
}

export interface LipanaPaymentResponse {
  success: boolean;
  paymentLink?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Creates a payment link using Lipana API
 * @param paymentData - Payment details
 * @returns Promise with payment link or error
 */
export async function createLipanaPaymentLink(
  paymentData: LipanaPaymentRequest
): Promise<LipanaPaymentResponse> {
  try {
    const response = await fetch(`${LIPANA_API.BASE_URL}/payment-links`, {
      method: 'POST',
      headers: {
        'x-api-key': LIPANA_API.SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: paymentData.title,
        amount: paymentData.amount,
        currency: paymentData.currency || 'KES',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      paymentLink: data.payment_url || data.paymentLink,
      transactionId: data.id || data.transaction_id,
    };
  } catch (error) {
    console.error('[Lipana] Payment link creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment link',
    };
  }
}

/**
 * Checks transaction status using Lipana API
 * @param transactionId - Transaction ID to check
 * @returns Promise with transaction status
 */
export async function checkLipanaTransactionStatus(
  transactionId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const response = await fetch(`${LIPANA_API.BASE_URL}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'x-api-key': LIPANA_API.SECRET_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      status: data.status,
    };
  } catch (error) {
    console.error('[Lipana] Transaction status check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check transaction status',
    };
  }
}

/**
 * Gets all transactions from Lipana API
 * @returns Promise with transactions list
 */
export async function getLipanaTransactions(): Promise<{
  success: boolean;
  transactions?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(`${LIPANA_API.BASE_URL}/transactions`, {
      method: 'GET',
      headers: {
        'x-api-key': LIPANA_API.SECRET_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      transactions: data.transactions || data,
    };
  } catch (error) {
    console.error('[Lipana] Failed to get transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transactions',
    };
  }
}
