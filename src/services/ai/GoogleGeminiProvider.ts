// -------------------------------------------------------------
// 🤖 Google Gemini AI Provider
// -------------------------------------------------------------
// Google Gemini API integration for text generation

import Logger from '@/utils/logger';
import { AiProvider, AiGenerationResult, AiGenerationOptions } from './types';
import { CONFIG } from '@/constants/config';

export class GoogleGeminiProvider implements AiProvider {
    name = 'Google Gemini';
    private apiKey: string | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        try {
            // Try to get API key from environment/config
            this.apiKey = CONFIG.GOOGLE_GEMINI_API_KEY || null;
            this.isInitialized = true;

            Logger.info('GoogleGeminiProvider', 'Initialized', {
                hasApiKey: !!this.apiKey,
            });
        } catch (error) {
            Logger.error('GoogleGeminiProvider', 'Initialization failed', error);
            this.isInitialized = false;
        }
    }

    async isAvailable(): Promise<boolean> {
        return this.isInitialized && !!this.apiKey;
    }

    async generateText(prompt: string, options: AiGenerationOptions = {}): Promise<AiGenerationResult> {
        if (!this.apiKey) {
            throw new Error('Google Gemini API key not configured');
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        maxOutputTokens: options.maxTokens || 1000,
                        topP: 0.8,
                        topK: 10,
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            const tokensUsed = this.estimateTokens(prompt + generatedText);

            return {
                text: generatedText,
                provider: 'google-gemini',
                tokensUsed,
                costEstimate: this.estimateCost(tokensUsed),
            };
        } catch (error) {
            Logger.error('GoogleGeminiProvider', 'Generation failed', error);
            throw new Error(`Google Gemini generation failed: ${(error as Error).message}`);
        }
    }

    estimateCost(tokens: number): number {
        // Gemini pricing: $0.00025 per 1K characters (roughly equivalent to tokens)
        // This is approximate and should be updated based on actual pricing
        const costPerThousandChars = 0.00025;
        const estimatedChars = tokens * 4; // Rough approximation
        return (estimatedChars / 1000) * costPerThousandChars;
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
}
