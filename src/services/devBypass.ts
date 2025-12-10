import AsyncStorage from "@react-native-async-storage/async-storage";
import { devBypass } from "@/native";

import { ADMIN_UNLOCK_STORAGE_KEY } from "@/providers/BillingProvider";

const DEV_BYPASS_STORAGE_KEY = "DEV_BYPASS_OVERRIDE";

async function persistFlag(value: boolean): Promise<void> {
  const tasks: Array<Promise<void>> = [
    AsyncStorage.setItem(DEV_BYPASS_STORAGE_KEY, value ? "true" : "false"),
  ];

  if (value) {
    tasks.push(AsyncStorage.setItem(ADMIN_UNLOCK_STORAGE_KEY, "1"));
  } else {
    tasks.push(AsyncStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY));
  }

  await Promise.all(tasks);
}

export async function enableDeveloperBypass(): Promise<void> {
  await persistFlag(true);
  try {
    await devBypass.enable();
  } catch (error) {
    console.warn("[devBypass] native enable failed", error);
  }
}

export async function disableDeveloperBypass(): Promise<void> {
  await persistFlag(false);
  try {
    await devBypass.disable();
  } catch (error) {
    console.warn("[devBypass] native disable failed", error);
  }
}

export async function isDeveloperBypassEnabled(): Promise<boolean> {
  try {
    // Check native bridge first
    const nativeValue = await devBypass.isEnabled();
    if (nativeValue) return true;
  } catch (error) {
    console.warn("[devBypass] native isEnabled failed", error);
  }

  const raw = await AsyncStorage.getItem(DEV_BYPASS_STORAGE_KEY);
  return raw === "true";
}

export { DEV_BYPASS_STORAGE_KEY };