// -------------------------------------------------------------
// 🤖 Cohere AI Provider
// -------------------------------------------------------------
// Cohere API integration for text generation

import Logger from '@/utils/logger';
import { AiProvider, AiGenerationResult, AiGenerationOptions } from './types';
import { CONFIG } from '@/constants/config';

export class CohereProvider implements AiProvider {
    name = 'Cohere';
    private apiKey: string | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        try {
            // Try to get API key from environment/config
            this.apiKey = CONFIG.COHERE_API_KEY || null;
            this.isInitialized = true;

            Logger.info('CohereProvider', 'Initialized', {
                hasApiKey: !!this.apiKey,
            });
        } catch (error) {
            Logger.error('CohereProvider', 'Initialization failed', error);
            this.isInitialized = false;
        }
    }

    async isAvailable(): Promise<boolean> {
        return this.isInitialized && !!this.apiKey;
    }

    async generateText(prompt: string, options: AiGenerationOptions = {}): Promise<AiGenerationResult> {
        if (!this.apiKey) {
            throw new Error('Cohere API key not configured');
        }

        try {
            const response = await fetch('https://api.cohere.ai/v1/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'command', // Using Command model for text generation
                    prompt: prompt,
                    max_tokens: options.maxTokens || 100,
                    temperature: options.temperature || 0.7,
                    k: 0,
                    p: 0.75,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                    stop_sequences: [],
                    return_likelihoods: 'NONE',
                }),
            });

            if (!response.ok) {
                throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.generations || !data.generations[0] || !data.generations[0].text) {
                throw new Error('Invalid response from Cohere API');
            }

            const generatedText = data.generations[0].text;
            const tokensUsed = data.meta?.billed_units?.input_tokens + data.meta?.billed_units?.output_tokens || this.estimateTokens(prompt + generatedText);

            return {
                text: generatedText,
                provider: 'cohere',
                tokensUsed,
                costEstimate: this.estimateCost(tokensUsed),
            };
        } catch (error) {
            Logger.error('CohereProvider', 'Generation failed', error);
            throw new Error(`Cohere generation failed: ${(error as Error).message}`);
        }
    }

    estimateCost(tokens: number): number {
        // Cohere pricing: $0.0005 per 100 tokens (approximate)
        // This is approximate and should be updated based on actual pricing
        return (tokens / 100) * 0.0005;
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
}
