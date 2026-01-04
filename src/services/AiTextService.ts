// -------------------------------------------------------------
// 🤖 AI Text Service
// -------------------------------------------------------------
// Main service orchestrating AI text generation with multiple providers

import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '@/utils/logger';
import { OpenAiProvider } from './ai/OpenAiProvider';
import { PuterAiProvider } from './ai/PuterAiProvider';
import { AiProvider, AiGenerationResult, PromptType, UsageLogEntry } from './ai/types';
import { runQuery } from '@/db/database';

const STORAGE_KEYS = {
    selectedProvider: 'ai:selected_provider',
    totalGenerations: 'ai:total_generations',
    totalCost: 'ai:total_cost',
};

// Rate limiting: max 10 generations per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_GENERATIONS_PER_WINDOW = 10;

export enum AiProviderType {
    OPENAI = 'openai',
    PUTER = 'puter',
    AUTO = 'auto', // Auto-select based on availability
}

class AiTextService {
    private openAiProvider: OpenAiProvider;
    private puterAiProvider: PuterAiProvider;
    private selectedProviderType: AiProviderType = AiProviderType.AUTO;
    private recentGenerations: number[] = []; // Timestamps

    constructor() {
        this.openAiProvider = new OpenAiProvider();
        this.puterAiProvider = new PuterAiProvider();
    }

    /**
     * Initialize the service
     */
    async initialize() {
        // Load selected provider preference
        const savedProvider = await AsyncStorage.getItem(STORAGE_KEYS.selectedProvider);
        if (savedProvider) {
            this.selectedProviderType = savedProvider as AiProviderType;
        }

        // Initialize OpenAI provider
        await this.openAiProvider.initialize();

        Logger.info('AiTextService', 'Service initialized', {
            selectedProvider: this.selectedProviderType,
        });
    }

    /**
     * Set preferred provider
     */
    async setProvider(provider: AiProviderType) {
        this.selectedProviderType = provider;
        await AsyncStorage.setItem(STORAGE_KEYS.selectedProvider, provider);
        Logger.info('AiTextService', `Provider set to ${provider}`);
    }

    /**
     * Get current provider based on availability
     */
    private async getProvider(): Promise<AiProvider> {
        if (this.selectedProviderType === AiProviderType.OPENAI) {
            const available = await this.openAiProvider.isAvailable();
            if (available) return this.openAiProvider;

            Logger.warn('AiTextService', 'OpenAI not available, falling back to Puter');
            return this.puterAiProvider;
        }

        if (this.selectedProviderType === AiProviderType.PUTER) {
            return this.puterAiProvider;
        }

        // AUTO mode: try OpenAI first, fallback to Puter
        const openAiAvailable = await this.openAiProvider.isAvailable();
        if (openAiAvailable) {
            return this.openAiProvider;
        }

        Logger.info('AiTextService', 'Using Puter.ai (free tier)');
        return this.puterAiProvider;
    }

    /**
     * Check rate limiting
     */
    private checkRateLimit(): boolean {
        const now = Date.now();

        // Remove old timestamps outside window
        this.recentGenerations = this.recentGenerations.filter(
            ts => now - ts < RATE_LIMIT_WINDOW_MS
        );

        // Check if limit exceeded
        if (this.recentGenerations.length >= MAX_GENERATIONS_PER_WINDOW) {
            const oldestTimestamp = this.recentGenerations[0];
            const waitTimeMs = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
            Logger.warn('AiTextService', `Rate limit exceeded. Wait ${Math.ceil(waitTimeMs / 1000)}s`);
            return false;
        }

        // Add current timestamp
        this.recentGenerations.push(now);
        return true;
    }

    /**
     * Generate message variation
     */
    async generateMessageVariation(originalMessage: string): Promise<string> {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }

        const prompt = `Rewrite this SMS message to be more engaging and professional while keeping it concise (under 160 characters if possible):\n\n"${originalMessage}"\n\nProvide only the rewritten message, nothing else.`;

        const result = await this.generateText(prompt, PromptType.MESSAGE_VARIATION);
        return result.text.trim();
    }

    /**
     * Personalize message with context
     */
    async personalizeMessage(
        template: string,
        context: Record<string, any>
    ): Promise<string> {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }

        const contextStr = JSON.stringify(context, null, 2);
        const prompt = `Personalize this message template using the provided context. Replace placeholders and make it sound natural:\n\nTemplate: "${template}"\n\nContext:\n${contextStr}\n\nProvide only the personalized message.`;

        const result = await this.generateText(prompt, PromptType.PERSONALIZATION);
        return result.text.trim();
    }

    /**
     * Optimize message for SMS length
     */
    async optimizeForSms(message: string, maxLength: number = 160): Promise<string> {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }

        const prompt = `Shorten this message to fit within ${maxLength} characters while preserving the key information:\n\n"${message}"\n\nProvide only the shortened message.`;

        const result = await this.generateText(prompt, PromptType.SMS_OPTIMIZATION, {
            maxTokens: 100,
        });
        return result.text.trim();
    }

    /**
     * Generate multiple message suggestions
     */
    async suggestMessages(topic: string, count: number = 3): Promise<string[]> {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }

        const prompt = `Generate ${count} different SMS messages about: "${topic}". Each should be concise (under 160 characters) and engaging. Separate each message with "---".`;

        const result = await this.generateText(prompt, PromptType.SUGGESTION, {
            maxTokens: 300,
        });

        // Split by separator and clean up
        const messages = result.text
            .split('---')
            .map(msg => msg.trim())
            .filter(msg => msg.length > 0)
            .slice(0, count);

        return messages;
    }

    /**
     * Core generation method
     */
    private async generateText(
        prompt: string,
        promptType: PromptType,
        options: any = {}
    ): Promise<AiGenerationResult> {
        try {
            const provider = await this.getProvider();

            Logger.info('AiTextService', `Generating with ${provider.name}`, {
                promptType,
                promptLength: prompt.length,
            });

            const result = await provider.generateText(prompt, options);

            // Log usage
            await this.logUsage({
                provider: result.provider,
                promptType,
                inputLength: prompt.length,
                outputLength: result.text.length,
                tokensUsed: result.tokensUsed,
                costEstimate: result.costEstimate,
                timestamp: Date.now(),
            });

            // Update totals
            await this.updateTotals(result.costEstimate);

            return result;
        } catch (error) {
            Logger.error('AiTextService', 'Generation failed', error);
            throw error;
        }
    }

    /**
     * Log usage to database
     */
    private async logUsage(entry: UsageLogEntry) {
        try {
            await runQuery(
                `INSERT INTO ai_usage_log 
                (provider, prompt_type, input_length, output_length, tokens_used, cost_estimate, timestamp) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    entry.provider,
                    entry.promptType,
                    entry.inputLength,
                    entry.outputLength,
                    entry.tokensUsed,
                    entry.costEstimate,
                    entry.timestamp,
                ]
            );
        } catch (error) {
            Logger.error('AiTextService', 'Failed to log usage', error);
        }
    }

    /**
     * Update total usage stats
     */
    private async updateTotals(cost: number) {
        try {
            // Increment total generations
            const currentTotal = await AsyncStorage.getItem(STORAGE_KEYS.totalGenerations);
            const newTotal = (parseInt(currentTotal || '0') + 1).toString();
            await AsyncStorage.setItem(STORAGE_KEYS.totalGenerations, newTotal);

            // Update total cost
            const currentCost = await AsyncStorage.getItem(STORAGE_KEYS.totalCost);
            const newCost = (parseFloat(currentCost || '0') + cost).toString();
            await AsyncStorage.setItem(STORAGE_KEYS.totalCost, newCost);
        } catch (error) {
            Logger.error('AiTextService', 'Failed to update totals', error);
        }
    }

    /**
     * Get usage statistics
     */
    async getUsageStats(): Promise<{
        totalGenerations: number;
        totalCost: number;
        remainingInWindow: number;
    }> {
        const totalGenerations = parseInt(
            (await AsyncStorage.getItem(STORAGE_KEYS.totalGenerations)) || '0'
        );
        const totalCost = parseFloat(
            (await AsyncStorage.getItem(STORAGE_KEYS.totalCost)) || '0'
        );

        // Calculate remaining in current window
        const now = Date.now();
        const recentCount = this.recentGenerations.filter(
            ts => now - ts < RATE_LIMIT_WINDOW_MS
        ).length;
        const remainingInWindow = Math.max(0, MAX_GENERATIONS_PER_WINDOW - recentCount);

        return {
            totalGenerations,
            totalCost,
            remainingInWindow,
        };
    }

    /**
     * Get Puter WebView component (for rendering)
     */
    getPuterWebView() {
        return this.puterAiProvider.getWebViewComponent();
    }
}

export const aiTextService = new AiTextService();
