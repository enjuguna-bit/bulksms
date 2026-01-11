// -------------------------------------------------------------
// 🤖 OpenAI Provider Implementation
// -------------------------------------------------------------
// OpenAI integration using official SDK

import OpenAI from 'openai';
import Logger from '@/utils/logger';
import { AiProvider, AiGenerationOptions, AiGenerationResult } from './types';
import { aiKeyManager, AiProviderKey } from '../AiKeyManager';

export class OpenAiProvider implements AiProvider {
    name = 'OpenAI';
    private client: OpenAI | null = null;
    private initialized = false;

    // Pricing per 1K tokens (gpt-3.5-turbo)
    private readonly INPUT_COST_PER_1K = 0.0015;
    private readonly OUTPUT_COST_PER_1K = 0.002;

    /**
     * Initialize the provider with API key
     */
    async initialize(): Promise<boolean> {
        try {
            const apiKey = await aiKeyManager.getKey(AiProviderKey.OPENAI);

            if (!apiKey) {
                Logger.warn('OpenAiProvider', 'No API key found');
                return false;
            }

            this.client = new OpenAI({
                apiKey,
                // dangerouslyAllowBrowser: true, // Not needed in React Native
            });

            this.initialized = true;
            Logger.info('OpenAiProvider', 'Initialized successfully');
            return true;
        } catch (error) {
            Logger.error('OpenAiProvider', 'Initialization failed', error);
            return false;
        }
    }

    /**
     * Check if provider is available
     */
    async isAvailable(): Promise<boolean> {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.initialized && this.client !== null;
    }

    /**
     * Generate text using OpenAI
     */
    async generateText(
        prompt: string,
        options: AiGenerationOptions = {}
    ): Promise<AiGenerationResult> {
        if (!await this.isAvailable()) {
            throw new Error('OpenAI provider not available');
        }

        try {
            Logger.info('OpenAiProvider', 'Generating text', { promptLength: prompt.length });

            const completion = await this.client!.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise, engaging SMS messages. Keep responses under 160 characters when possible unless asked otherwise.',
                }, {
                    role: 'user',
                    content: prompt,
                }],
                max_tokens: options.maxTokens || 150,
                temperature: options.temperature || 0.7,
                n: 1,
            });

            const text = completion.choices[0]?.message?.content || '';
            const tokensUsed = completion.usage?.total_tokens || 0;
            const costEstimate = this.calculateCost(
                completion.usage?.prompt_tokens || 0,
                completion.usage?.completion_tokens || 0
            );

            Logger.info('OpenAiProvider', 'Text generated successfully', {
                textLength: text.length,
                tokensUsed,
                costEstimate: `$${costEstimate.toFixed(4)}`,
            });

            return {
                text,
                provider: this.name,
                tokensUsed,
                costEstimate,
            };
        } catch (error: any) {
            Logger.error('OpenAiProvider', 'Text generation failed', error);

            // Handle specific OpenAI errors
            if (error.status === 401) {
                throw new Error('Invalid API key');
            } else if (error.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (error.status === 500) {
                throw new Error('OpenAI service error. Please try again.');
            }

            throw new Error(`Text generation failed: ${error.message}`);
        }
    }

    /**
     * Estimate cost for a prompt
     */
    estimateCost(tokens: number): number {
        // Assume output is similar length to input
        const inputCost = (tokens / 1000) * this.INPUT_COST_PER_1K;
        const outputCost = (tokens / 1000) * this.OUTPUT_COST_PER_1K;

        return inputCost + outputCost;
    }

    /**
     * Calculate actual cost from token usage
     */
    private calculateCost(inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens / 1000) * this.INPUT_COST_PER_1K;
        const outputCost = (outputTokens / 1000) * this.OUTPUT_COST_PER_1K;
        return inputCost + outputCost;
    }

    /**
     * Test the API key
     */
    async testConnection(): Promise<boolean> {
        try {
            const result = await this.generateText('Say "OK" if you can read this.', {
                maxTokens: 10,
            });
            return result.text.length > 0;
        } catch (error) {
            Logger.error('OpenAiProvider', 'Connection test failed', error);
            return false;
        }
    }
}
