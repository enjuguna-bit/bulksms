// -------------------------------------------------------------
// 🤖 AI Provider Interface
// -------------------------------------------------------------
// Abstract interface for different AI text generation providers

export interface AiGenerationOptions {
    maxLength?: number;
    temperature?: number;
    maxTokens?: number;
    language?: string;
}

export interface AiGenerationResult {
    text: string;
    provider: string;
    tokensUsed: number;
    costEstimate: number;
}

export interface AiProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    generateText(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult>;
    estimateCost(prompt: string): number;
}

export enum PromptType {
    MESSAGE_VARIATION = 'message_variation',
    PERSONALIZATION = 'personalization',
    SMS_OPTIMIZATION = 'sms_optimization',
    TRANSLATION = 'translation',
    SUGGESTION = 'suggestion',
}

export interface UsageLogEntry {
    provider: string;
    promptType: PromptType;
    inputLength: number;
    outputLength: number;
    tokensUsed: number;
    costEstimate: number;
    timestamp: number;
}
