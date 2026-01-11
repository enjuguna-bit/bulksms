// -------------------------------------------------------------
// 🤖 Anthropic Claude AI Provider
// -------------------------------------------------------------
// Anthropic Claude API integration for text generation

import Logger from '@/utils/logger';
import { AiProvider, AiGenerationResult, AiGenerationOptions } from './types';
import { CONFIG } from '@/constants/config';

export class AnthropicClaudeProvider implements AiProvider {
    name = 'Anthropic Claude';
    private apiKey: string | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        try {
            // Try to get API key from environment/config
            this.apiKey = CONFIG.ANTHROPIC_API_KEY || null;
            this.isInitialized = true;

            Logger.info('AnthropicClaudeProvider', 'Initialized', {
                hasApiKey: !!this.apiKey,
            });
        } catch (error) {
            Logger.error('AnthropicClaudeProvider', 'Initialization failed', error);
            this.isInitialized = false;
        }
    }

    async isAvailable(): Promise<boolean> {
        return this.isInitialized && !!this.apiKey;
    }

    async generateText(prompt: string, options: AiGenerationOptions = {}): Promise<AiGenerationResult> {
        if (!this.apiKey) {
            throw new Error('Anthropic Claude API key not configured');
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307', // Using Haiku for cost-effectiveness
                    max_tokens: options.maxTokens || 1000,
                    temperature: options.temperature || 0.7,
                    system: "You are a helpful assistant that generates SMS messages. Keep responses concise and under 160 characters when appropriate.",
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                }),
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid response from Claude API');
            }

            const generatedText = data.content[0].text;
            const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || this.estimateTokens(prompt + generatedText);

            return {
                text: generatedText,
                provider: 'anthropic-claude',
                tokensUsed,
                costEstimate: this.estimateCost(tokensUsed),
            };
        } catch (error) {
            Logger.error('AnthropicClaudeProvider', 'Generation failed', error);
            throw new Error(`Anthropic Claude generation failed: ${(error as Error).message}`);
        }
    }

    estimateCost(tokens: number): number {
        // Claude pricing (approximate):
        // Input: $0.25 per 1M tokens
        // Output: $1.25 per 1M tokens
        // Using average for estimation
        const costPerMillionTokens = 0.75; // Average of input/output
        return (tokens / 1000000) * costPerMillionTokens;
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
}
