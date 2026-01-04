// -----------------------------------------------------
// src/services/lipanaPayment.ts
// Lipana API integration using official SDK
// -----------------------------------------------------

import { LIPANA_API } from "@/constants/mpesa";

// Lazy-load SDK to avoid crash on module import
// The SDK may use crypto which isn't available until properly mocked
let _lipanaInstance: any = null;

function getLipana() {
  if (!_lipanaInstance) {
    try {
      // Dynamic import to defer SDK initialization
      const { Lipana } = require('@lipana/sdk');
      _lipanaInstance = new Lipana({
        apiKey: LIPANA_API.SECRET_KEY,
        environment: 'production'
      });
    } catch (e) {
      console.error('[LipanaSDK] Failed to initialize:', e);
      return null;
    }
  }
  return _lipanaInstance;
}

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
 * Creates a payment link using Lipana SDK
 */
export async function createLipanaPaymentLink(
  paymentData: LipanaPaymentRequest
): Promise<LipanaPaymentResponse> {
  try {
    const lipana = getLipana();
    if (!lipana) {
      return { success: false, error: 'SDK not available' };
    }
    const result = await lipana.paymentLinks.create({
      title: paymentData.title,
      amount: paymentData.amount,
      currency: paymentData.currency || 'KES',
      options: {
        phone: paymentData.phone
      }
    });

    return {
      success: true,
      paymentLink: result.payment_url || result.link || result.url,
      transactionId: result.id,
    };
  } catch (error: any) {
    console.error('[LipanaSDK] Create Link failed:', error);
    return {
      success: false,
      error: error.message || 'SDK Error',
    };
  }
}

/**
 * Checks transaction status using Lipana SDK
 */
export async function checkLipanaTransactionStatus(
  transactionId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const lipana = getLipana();
    if (!lipana) {
      return { success: false, error: 'SDK not available' };
    }
    const result = await lipana.transactions.retrieve(transactionId);
    return {
      success: true,
      status: result.status,
    };
  } catch (error: any) {
    console.error('[LipanaSDK] Check Status failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Gets all transactions using Lipana SDK
 */
export async function getLipanaTransactions(): Promise<{
  success: boolean;
  transactions?: any[];
  error?: string;
}> {
  try {
    const lipana = getLipana();
    if (!lipana) {
      return { success: false, transactions: [], error: 'SDK not available' };
    }
    const result = await lipana.transactions.list();
    const txs = Array.isArray(result) ? result : result.data || result.transactions;

    return {
      success: true,
      transactions: txs || [],
    };
  } catch (error: any) {
    console.error('[LipanaSDK] Get Transactions failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

