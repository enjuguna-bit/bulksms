// -----------------------------------------------------
// src/services/activation.ts — Activation & Licensing
// -----------------------------------------------------
//
// NOTE:
// - Replace the defaults with your real values.
// - Or inject via env: ACTIVATION_SERVER_URL, MPESA_TILL, ACTIVATION_PUBLIC_KEY_PEM
//

import { CONFIG } from "@/constants/config";
import { saveActivation, loadActivation, clearActivation } from "@/db/repositories/activation";
import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import { importSPKI, jwtVerify } from "jose";

// -----------------------------------------------------
// Config: activation endpoint + keys
// -----------------------------------------------------
//
// NOTE:
// - Replace the defaults with your real values.
// - Or inject via env: ACTIVATION_SERVER_URL, MPESA_TILL, ACTIVATION_PUBLIC_KEY_PEM
//

const ACTIVATION_SERVER_URL = CONFIG.ACTIVATION_SERVER_URL;
const MERCHANT_TILL = CONFIG.MERCHANT_TILL;
const ACTIVATION_PUBLIC_KEY_PEM = CONFIG.ACTIVATION_PUBLIC_KEY_PEM;

// -----------------------------------------------------
// Types
// -----------------------------------------------------

export type PlanType = "trial" | "monthly" | "quarterly" | "yearly";

export type ActivationResult =
  | {
    status: "activated" | "renewed" | "active" | "expired";
    trialEnd: number;
    plan: PlanType;
    token: string;
  }
  | { status: "not_found" }
  | { status: "error"; message?: string };

// ✅ Alias for older code that expects ServerActivationStatus
export type ServerActivationStatus = ActivationResult;

// José CryptoKey typing workaround (RN + jose)
let publicKeyCache: any | null = null;

// -----------------------------------------------------
// Device fingerprint helpers
// -----------------------------------------------------

async function getAndroidId(): Promise<string> {
  try {
    const id = await DeviceInfo.getAndroidId();
    return id || "unknown";
  } catch (_) {
    return "unknown";
  }
}

/**
 * Fingerprint = androidId + package name
 * Must stay stable between reinstalls
 */
export async function getFingerprint(): Promise<string> {
  if (Platform.OS !== "android") return "non-android";

  const androidId = await getAndroidId();
  const appId = "com.bulksms.smsmanager";

  return `${androidId}:${appId}`;
}

// -----------------------------------------------------
// Public key + token verification
// -----------------------------------------------------

async function getPublicKey() {
  if (publicKeyCache) return publicKeyCache;
  publicKeyCache = await importSPKI(ACTIVATION_PUBLIC_KEY_PEM, "RS256");
  return publicKeyCache;
}

/**
 * Verify JWT locally using embedded public key.
 * Returns ok:false for expired or invalid tokens.
 */
export async function verifyTokenLocally(
  token: string
): Promise<{ ok: boolean; trialEnd?: number; plan?: PlanType }> {
  try {
    const key = await getPublicKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ["RS256"] });

    const trialEnd = (payload as any).trialEnd as number | undefined;
    const plan = (payload as any).plan as PlanType | undefined;

    if (!trialEnd || Date.now() > trialEnd) {
      return { ok: false };
    }

    return { ok: true, trialEnd, plan };
  } catch (_) {
    return { ok: false };
  }
}

// -----------------------------------------------------
// Server calls
// -----------------------------------------------------

export async function activatePlan(
  plan: PlanType = "trial"
): Promise<ActivationResult> {
  try {
    const fingerprint = await getFingerprint();

    const res = await fetch(`${ACTIVATION_SERVER_URL}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, till: MERCHANT_TILL, plan }),
    });

    const data = await res.json();

    if (!data?.status || !data?.token) {
      return { status: "error", message: "Bad response" };
    }

    // Local verification
    const v = await verifyTokenLocally(data.token);
    if (!v.ok || !data.trialEnd) {
      return { status: "error", message: "Invalid token" };
    }

    await saveActivation(data.token, data.trialEnd);
    return data as ActivationResult;
  } catch (e: any) {
    return { status: "error", message: e?.message ?? "Network error" };
  }
}

export async function checkStatusOnServer(): Promise<ActivationResult> {
  try {
    const fingerprint = await getFingerprint();

    const res = await fetch(
      `${ACTIVATION_SERVER_URL}/status/${encodeURIComponent(fingerprint)}`
    );

    const data = await res.json();
    if (!data?.status || !data?.token) {
      return { status: "error", message: "Bad response" };
    }

    const v = await verifyTokenLocally(data.token);
    if (!v.ok || !data.trialEnd) {
      return { status: "error", message: "Invalid token" };
    }

    await saveActivation(data.token, data.trialEnd);
    return data as ActivationResult;
  } catch (e: any) {
    return { status: "error", message: e?.message ?? "Network error" };
  }
}

// -----------------------------------------------------
// Offline helpers
// -----------------------------------------------------

export async function checkStatusOffline(): Promise<
  "active" | "expired" | "not_found"
> {
  const { token, trialEnd } = await loadActivation();

  if (!token || !trialEnd) return "not_found";

  const v = await verifyTokenLocally(token);
  if (!v.ok) return "expired";

  return "active";
}

export async function getLocalPlanInfo(): Promise<{
  plan?: PlanType;
  trialEnd?: number;
}> {
  const { token } = await loadActivation();
  if (!token) return {};

  const v = await verifyTokenLocally(token);
  if (!v.ok) return {};

  return { plan: v.plan, trialEnd: v.trialEnd };
}

// -----------------------------------------------------
// Reset / Legacy alias
// -----------------------------------------------------

export async function resetActivation() {
  await clearActivation();
}

// Backward compatibility alias for old callers
export const activateOnServer = activatePlan;
