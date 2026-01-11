// -------------------------------------------------------------
// 🤖 Hugging Face AI Provider
// -------------------------------------------------------------
// Hugging Face Inference API integration for text generation

import Logger from '@/utils/logger';
import { AiProvider, AiGenerationResult, AiGenerationOptions } from './types';
import { CONFIG } from '@/constants/config';

export class HuggingFaceProvider implements AiProvider {
    name = 'Hugging Face';
    private apiKey: string | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        try {
            // Try to get API key from environment/config
            this.apiKey = CONFIG.HUGGINGFACE_API_KEY || null;
            this.isInitialized = true;

            Logger.info('HuggingFaceProvider', 'Initialized', {
                hasApiKey: !!this.apiKey,
            });
        } catch (error) {
            Logger.error('HuggingFaceProvider', 'Initialization failed', error);
            this.isInitialized = false;
        }
    }

    async isAvailable(): Promise<boolean> {
        return this.isInitialized && !!this.apiKey;
    }

    async generateText(prompt: string, options: AiGenerationOptions = {}): Promise<AiGenerationResult> {
        if (!this.apiKey) {
            throw new Error('Hugging Face API key not configured');
        }

        try {
            // Using a popular text generation model like GPT-2 or similar
            const model = 'microsoft/DialoGPT-medium'; // Can be configured for different models

            const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: options.maxTokens || 100,
                        temperature: options.temperature || 0.7,
                        do_sample: true,
                        pad_token_id: 50256, // GPT-2 pad token
                    },
                    options: {
                        wait_for_model: true,
                        use_cache: true,
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data || !data[0] || !data[0].generated_text) {
                throw new Error('Invalid response from Hugging Face API');
            }

            const generatedText = data[0].generated_text;
            const tokensUsed = this.estimateTokens(prompt + generatedText);

            return {
                text: generatedText,
                provider: 'hugging-face',
                tokensUsed,
                costEstimate: this.estimateCost(tokensUsed),
            };
        } catch (error) {
            Logger.error('HuggingFaceProvider', 'Generation failed', error);
            throw new Error(`Hugging Face generation failed: ${(error as Error).message}`);
        }
    }

    estimateCost(tokens: number): number {
        // Hugging Face pricing: $0.0001 per request + $0.00005 per token (approximate)
        // This is approximate and should be updated based on actual pricing
        const baseCostPerRequest = 0.0001;
        const costPerToken = 0.00005;
        return baseCostPerRequest + (tokens * costPerToken);
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
}
