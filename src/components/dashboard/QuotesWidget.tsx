import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Quote, Copy, RefreshCw } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card } from '@/components/ui';

interface QuoteData {
    content: string;
    author: string;
    length: number;
}

const FALLBACK_QUOTES: QuoteData[] = [
    {
        content: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        length: 56
    },
    {
        content: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        author: "Winston Churchill",
        length: 95
    },
    {
        content: "The best time to plant a tree was 20 years ago. The second best time is now.",
        author: "Chinese Proverb",
        length: 82
    }
];

export const QuotesWidget = () => {
    const { colors, theme } = useThemeSettings();
    const isDark = theme === 'dark';
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchQuote = useCallback(async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const response = await fetch('https://api.realinspire.live/v1/quotes/random', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data: QuoteData[] = await response.json();

            if (data && data.length > 0) {
                setQuote(data[0]);
            } else {
                // Fallback to random fallback quote
                const randomIndex = Math.floor(Math.random() * FALLBACK_QUOTES.length);
                setQuote(FALLBACK_QUOTES[randomIndex]);
            }
        } catch (error) {
            console.error('Error fetching quote:', error);
            // Use fallback quote on error
            const randomIndex = Math.floor(Math.random() * FALLBACK_QUOTES.length);
            setQuote(FALLBACK_QUOTES[randomIndex]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const copyToClipboard = useCallback(async () => {
        if (!quote) return;

        try {
            const text = `"${quote.content}" - ${quote.author}`;
            Clipboard.setString(text);
            Alert.alert('Success', 'Quote copied to clipboard!');
        } catch (error) {
            Alert.alert('Error', 'Failed to copy quote');
        }
    }, [quote]);

    const handleManualRefresh = useCallback(() => {
        fetchQuote(true);
    }, [fetchQuote]);

    // Auto-update on dashboard open (focus)
    useFocusEffect(
        useCallback(() => {
            fetchQuote();
            // Optional: Cleanup if needed, but fetchQuote handles state
        }, [fetchQuote])
    );

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            fetchQuote();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchQuote]);

    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Quote size={18} color={kenyaColors.quotePurple} />
                    <Text style={[styles.title, { color: colors.text }]}>Daily Inspiration</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={copyToClipboard}
                        style={[styles.iconButton, { backgroundColor: isDark ? '#333' : '#f5f3ff' }]}
                        disabled={loading || !quote}
                    >
                        <Copy size={18} color={kenyaColors.quotePurple} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleManualRefresh}
                        style={[styles.iconButton, { backgroundColor: isDark ? '#333' : '#f5f3ff' }]}
                        disabled={loading || refreshing}
                    >
                        <RefreshCw
                            size={18}
                            color={kenyaColors.quotePurple}
                            style={refreshing ? styles.spinning : undefined}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={kenyaColors.quotePurple} />
                    <Text style={styles.loadingText}>Loading inspiration...</Text>
                </View>
            ) : quote ? (
                <View style={styles.content}>
                    <View style={styles.quoteMarkContainer}>
                        <Text style={styles.quoteMark}>"</Text>
                    </View>
                    <Text style={[styles.quoteText, { color: isDark ? '#E0E0E0' : '#1a1a1a' }]}>{quote.content}</Text>
                    <Text style={styles.authorText}>— {quote.author}</Text>
                </View>
            ) : (
                <Text style={styles.errorText}>Unable to load quote</Text>
            )
            }
        </Card >
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: kenyaColors.quotePurple,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 6,
        borderRadius: 8,
    },
    spinning: {
        transform: [{ rotate: '180deg' }],
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    content: {
        position: 'relative',
    },
    quoteMarkContainer: {
        position: 'absolute',
        top: -8,
        left: -4,
        opacity: 0.08, // Reduced from 0.15 for less interference
    },
    quoteMark: {
        fontSize: 60,
        fontWeight: '700',
        color: kenyaColors.quotePurple,
        fontFamily: 'serif',
    },
    quoteText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#1a1a1a', // Changed from #333 to darker for better contrast
        fontStyle: 'italic',
        marginBottom: 8,
        paddingLeft: 4,
        fontWeight: '500', // Added weight for better visibility
    },
    authorText: {
        fontSize: 14,
        fontWeight: '600',
        color: kenyaColors.quotePurple,
        textAlign: 'right',
        marginTop: 4,
    },
    errorText: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 12,
    },
});
