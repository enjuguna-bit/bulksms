// src/services/serverConfig.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "daraja_server_url";

export async function saveServerUrl(url: string) {
  await AsyncStorage.setItem(KEY, url);
}

export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearServerUrl() {
  await AsyncStorage.removeItem(KEY);
}
