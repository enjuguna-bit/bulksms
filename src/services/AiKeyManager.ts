// -------------------------------------------------------------
// 🔐 AI API Key Manager
// -------------------------------------------------------------
// Secure storage and management of AI provider API keys

import * as Keychain from 'react-native-keychain';
import Logger from '@/utils/logger';

const KEYCHAIN_SERVICE = 'com.bulksms.ai';

export enum AiProviderKey {
    OPENAI = 'openai_api_key',
    PUTER = 'puter_api_key',
}

class AiKeyManager {
    /**
     * Save API key securely
     */
    async saveKey(provider: AiProviderKey, apiKey: string): Promise<boolean> {
        try {
            // Validate key format
            if (!this.validateKeyFormat(provider, apiKey)) {
                throw new Error(`Invalid API key format for ${provider}`);
            }

            await Keychain.setGenericPassword(provider, apiKey, {
                service: KEYCHAIN_SERVICE,
                accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
            });

            Logger.info('AiKeyManager', `API key saved for ${provider}`);
            return true;
        } catch (error) {
            Logger.error('AiKeyManager', 'Failed to save API key', error);
            return false;
        }
    }

    /**
     * Retrieve API key
     */
    async getKey(provider: AiProviderKey): Promise<string | null> {
        try {
            const credentials = await Keychain.getGenericPassword({
                service: KEYCHAIN_SERVICE,
            });

            if (credentials && credentials.username === provider) {
                return credentials.password;
            }

            return null;
        } catch (error) {
            Logger.error('AiKeyManager', 'Failed to retrieve API key', error);
            return null;
        }
    }

    /**
     * Check if API key exists
     */
    async hasKey(provider: AiProviderKey): Promise<boolean> {
        const key = await this.getKey(provider);
        return key !== null && key.length > 0;
    }

    /**
     * Delete API key
     */
    async deleteKey(provider: AiProviderKey): Promise<boolean> {
        try {
            await Keychain.resetGenericPassword({
                service: KEYCHAIN_SERVICE,
            });

            Logger.info('AiKeyManager', `API key deleted for ${provider}`);
            return true;
        } catch (error) {
            Logger.error('AiKeyManager', 'Failed to delete API key', error);
            return false;
        }
    }

    /**
     * Validate API key format
     */
    private validateKeyFormat(provider: AiProviderKey, apiKey: string): boolean {
        if (!apiKey || apiKey.length < 10) {
            return false;
        }

        switch (provider) {
            case AiProviderKey.OPENAI:
                // OpenAI keys start with "sk-"
                return apiKey.startsWith('sk-') && apiKey.length > 40;

            case AiProviderKey.PUTER:
                // Puter keys can be any string
                return apiKey.length > 10;

            default:
                return false;
        }
    }

    /**
     * Test API key validity by making a test call
     */
    async testKey(provider: AiProviderKey, apiKey: string): Promise<boolean> {
        try {
            // This will be implemented by each provider
            // For now, just validate format
            return this.validateKeyFormat(provider, apiKey);
        } catch (error) {
            Logger.error('AiKeyManager', 'API key test failed', error);
            return false;
        }
    }
}

export const aiKeyManager = new AiKeyManager();
