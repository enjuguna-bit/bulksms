// -----------------------------------------------------
// src/constants/mpesa.ts — React Native CLI version
// -----------------------------------------------------

/**
 * ✅ M-PESA STK Push endpoint.
 * Uses environment variable if defined, otherwise falls back to the default Cloudflare Worker.
 */
export const MPESA_WORKER_URL =
  process.env.MPESA_URL ||
  process.env.REACT_NATIVE_MPESA_URL ||
  'https://mpesa-stk-worker.enjugunake.workers.dev/stkpush';

/**
 * ✅ Lipana API Configuration for M-PESA STK Push
 */
export const LIPANA_API = {
  BASE_URL: 'https://api.lipana.dev/v1',
  PUBLIC_KEY: 'your_lipana_public_key_here',
  SECRET_KEY: 'your_lipana_secret_key_here',
};

/**
 * ✅ Subscription plan options (days → amount KES)
 */
export interface MpesaPlan {
  days: number;
  amount: number;
  bestValue?: boolean;
}

export const MPESA_PLANS: MpesaPlan[] = [
  { days: 1, amount: 200 },
  { days: 7, amount: 900 },
  { days: 30, amount: 3900, bestValue: true }, // ⭐ Highlight monthly plan
];
