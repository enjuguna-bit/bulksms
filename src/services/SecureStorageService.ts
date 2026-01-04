import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";

// ---------------------------------------------------------
// 🔐 SecureStorageService
// Unifies storage across the app using Keychain (High Security)
// and AsyncStorage (Fast / Web Fallback) with encryption.
// ---------------------------------------------------------

const FALLBACK_ENCRYPTION_KEY = "BulkSMS_Secure_Fallback_Key_v1";

export class SecureStorageService {
    /**
     * Save a value securely.
     * - Tries to save to Keychain (Hardware backed on supported devices)
     * - Saves an encrypted copy to AsyncStorage as backup/fast cache
     */
    static async setItem(key: string, value: string): Promise<void> {
        try {
            const encrypted = await this.encrypt(value);

            // Atomic-like write: Try both
            if (Platform.OS !== "web") {
                try {
                    // Keychain stores username/password. We use 'key' as service, 'user' as account, value as password.
                    await Keychain.setGenericPassword("user", encrypted, { service: key });
                } catch (e) {
                    console.warn(`[SecureStorage] Keychain write failed for ${key}`, e);
                }
            }

            // Always write to AsyncStorage as fallback (encrypted)
            await AsyncStorage.setItem(key, encrypted);
        } catch (error) {
            console.error(`[SecureStorage] setItem failed for ${key}`, error);
            throw error;
        }
    }

    /**
     * Retrieve a value securely.
     * - Tries Keychain first
     * - Falls back to AsyncStorage if Keychain fails or is empty
     */
    static async getItem(key: string): Promise<string | null> {
        try {
            if (Platform.OS !== "web") {
                try {
                    const credentials = await Keychain.getGenericPassword({ service: key });
                    if (credentials && credentials.password) {
                        return await this.decrypt(credentials.password);
                    }
                } catch (e) {
                    console.warn(`[SecureStorage] Keychain read failed for ${key}`, e);
                }
            }

            // Fallback to AsyncStorage
            const raw = await AsyncStorage.getItem(key);
            if (raw) {
                return await this.decrypt(raw);
            }
            return null;
        } catch (error) {
            console.error(`[SecureStorage] getItem failed for ${key}`, error);
            return null;
        }
    }

    /**
     * Remove a value.
     */
    static async removeItem(key: string): Promise<void> {
        try {
            if (Platform.OS !== "web") {
                await Keychain.resetGenericPassword({ service: key });
            }
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`[SecureStorage] removeItem failed for ${key}`, error);
        }
    }

    /**
     * Multi-remove
     */
    static async multiRemove(keys: string[]): Promise<void> {
        try {
            for (const key of keys) {
                await this.removeItem(key);
            }
        } catch (error) {
            console.error(`[SecureStorage] multiRemove failed`, error);
        }
    }

    /**
    * Multi-set for atomic-like updates
    */
    static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
        try {
            const encryptedPairs: [string, string][] = [];

            for (const [key, value] of keyValuePairs) {
                const encrypted = await this.encrypt(value);
                encryptedPairs.push([key, encrypted]);

                // Best-effort Keychain Write (Iterative)
                if (Platform.OS !== "web") {
                    try {
                        await Keychain.setGenericPassword("user", encrypted, { service: key });
                    } catch (e) {
                        // Keychain failure shouldn't doom the atomic DB write
                        // but we log it
                        console.warn(`[SecureStorage] Keychain write failed for ${key} in batch`, e);
                    }
                }
            }

            // Atomic Write to AsyncStorage (The core consistency fix)
            await AsyncStorage.multiSet(encryptedPairs);

        } catch (error) {
            console.error(`[SecureStorage] multiSet failed`, error);
            throw error; // Re-throw to let caller know transaction failed
        }
    }

    // ---------------------------------------------------------
    // 🔐 Encryption / Obfuscation (Fallback Layer)
    // ---------------------------------------------------------
    // Note: Keychain handles the real encryption.
    // This layer prevents plain-text reads from AsyncStorage (e.g. root access).
    // Uses a simple XOR + Base64 for performance and lack of native crypto deps overhead.

    private static async encrypt(text: string): Promise<string> {
        // 1. XOR
        const xor = this.xorr(text, FALLBACK_ENCRYPTION_KEY);
        // 2. Base64
        return this.toBase64(xor);
    }

    private static async decrypt(encrypted: string): Promise<string> {
        try {
            // 1. Base64 Decode
            const xor = this.fromBase64(encrypted);
            // 2. XOR
            return this.xorr(xor, FALLBACK_ENCRYPTION_KEY);
        } catch (e) {
            // If decryption fails (e.g. old plain data), try returning as is for migration
            return encrypted;
        }
    }

    private static xorr(text: string, key: string): string {
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    }

    private static toBase64(text: string): string {
        try {
            return btoa(text);
        } catch (e) {
            // React Native polyfill should assume btoa exists, but if not:
            return global.btoa ? global.btoa(text) : text;
        }
    }

    private static fromBase64(text: string): string {
        try {
            return atob(text);
        } catch (e) {
            return global.atob ? global.atob(text) : text;
        }
    }
}
