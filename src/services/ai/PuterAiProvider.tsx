// -------------------------------------------------------------
// 🌐 Puter.ai Provider Implementation
// -------------------------------------------------------------
// Puter.ai integration via WebView bridge for free AI generation

import React from 'react';
import { WebView } from 'react-native-webview';
import Logger from '@/utils/logger';
import { AiProvider, AiGenerationOptions, AiGenerationResult } from './types';

const PUTER_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <script src="https://js.puter.com/v2/"></script>
    <script>
        let messageQueue = [];
        let isReady = false;

        // Initialize Puter
        window.addEventListener('DOMContentLoaded', () => {
            isReady = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready'
            }));
        });

        // Generate text function
        window.generateText = function(prompt, options = {}) {
            const model = options.model || 'gpt-5-nano';
            const maxTokens = options.maxTokens || 150;

            puter.ai.chat(prompt, { model, max_tokens: maxTokens })
                .then(response => {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'success',
                        text: response,
                        model: model,
                    }));
                })
                .catch(error => {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        error: error.message || 'Generation failed'
                    }));
                });
        };
    </script>
</body>
</html>
`;

type MessageHandler = {
    resolve: (result: AiGenerationResult) => void;
    reject: (error: Error) => void;
};

export class PuterAiProvider implements AiProvider {
    name = 'Puter.ai';
    private isReady = false;
    private webViewRef: WebView | null = null;
    private pendingRequests = new Map<number, MessageHandler>();
    private requestId = 0;

    /**
     * Check if provider is available
     */
    async isAvailable(): Promise<boolean> {
        // Puter is always available (free service)
        return true;
    }

    /**
     * Set WebView reference (called from component)
     */
    setWebView(webView: WebView) {
        this.webViewRef = webView;
    }

    /**
     * Handle message from WebView
     */
    handleMessage(event: any) {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'ready') {
                this.isReady = true;
                Logger.info('PuterAiProvider', 'WebView ready');
                return;
            }

            // Find pending request (use first one for simplicity)
            const [requestId, handler] = Array.from(this.pendingRequests.entries())[0] || [];

            if (!handler) {
                Logger.warn('PuterAiProvider', 'No pending request found');
                return;
            }

            this.pendingRequests.delete(requestId!);

            if (data.type === 'success') {
                handler.resolve({
                    text: data.text,
                    provider: this.name,
                    tokensUsed: Math.ceil(data.text.length / 4), // Estimate
                    costEstimate: 0, // Free!
                });
            } else if (data.type === 'error') {
                handler.reject(new Error(data.error));
            }
        } catch (error) {
            Logger.error('PuterAiProvider', 'Message handling failed', error);
        }
    }

    /**
     * Generate text using Puter.ai
     */
    async generateText(
        prompt: string,
        options: AiGenerationOptions = {}
    ): Promise<AiGenerationResult> {
        if (!this.isReady || !this.webViewRef) {
            throw new Error('Puter.ai WebView not ready');
        }

        return new Promise((resolve, reject) => {
            const id = this.requestId++;

            // Set timeout for request
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, 30000); // 30 second timeout

            this.pendingRequests.set(id, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
            });

            // Inject JavaScript to call generateText
            const jsCode = `
                window.generateText(${JSON.stringify(prompt)}, {
                    maxTokens: ${options.maxTokens || 150}
                });
            `;

            const webView = this.webViewRef;
            if (webView) {
                webView.injectJavaScript(jsCode);
            } else {
                Logger.error('PuterAiProvider', 'WebView ref lost during generation');
            }

            Logger.info('PuterAiProvider', 'Text generation requested', {
                promptLength: prompt.length,
            });
        });
    }

    /**
     * Estimate cost (always $0 for Puter)
     */
    estimateCost(prompt: string): number {
        return 0; // Free service!
    }

    /**
     * Get WebView component
     */
    getWebViewComponent(): React.ReactElement {
        return (
            <WebView
                ref={(ref) => {
                    if (ref) this.setWebView(ref);
                }}
                source={{ html: PUTER_HTML }}
                style={{ height: 0, width: 0, opacity: 0 }}
                onMessage={this.handleMessage.bind(this)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
        );
    }
}
