// -------------------------------------------------------------
// 💬 AI Suggestion Panel
// -------------------------------------------------------------
// Displays AI-generated message suggestions

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from 'react-native';

interface AiSuggestionPanelProps {
    suggestions: string[];
    loading?: boolean;
    error?: string | null;
    onSelectSuggestion: (suggestion: string) => void;
    onDismiss: () => void;
    onRetry?: () => void;
}

export function AiSuggestionPanel({
    suggestions,
    loading = false,
    error = null,
    onSelectSuggestion,
    onDismiss,
    onRetry,
}: AiSuggestionPanelProps) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerIcon}>✨</Text>
                    <Text style={styles.headerTitle}>AI Suggestions</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.loadingText}>Generating suggestions...</Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    {onRetry && (
                        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {!loading && !error && suggestions.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No suggestions available</Text>
                </View>
            )}

            {!loading && !error && suggestions.length > 0 && (
                <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => `suggestion-${index}`}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            style={styles.suggestionCard}
                            onPress={() => onSelectSuggestion(item)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.suggestionHeader}>
                                <Text style={styles.suggestionNumber}>#{index + 1}</Text>
                                <Text style={styles.suggestionLength}>
                                    {item.length} chars
                                </Text>
                            </View>
                            <Text style={styles.suggestionText}>{item}</Text>
                            <View style={styles.suggestionFooter}>
                                <Text style={styles.tapHint}>Tap to use</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 16,
        maxHeight: '70%',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIcon: {
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    closeIcon: {
        fontSize: 24,
        color: '#666',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 14,
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    errorIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    suggestionCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    suggestionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    suggestionNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    suggestionLength: {
        fontSize: 11,
        color: '#999',
    },
    suggestionText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#333',
        marginBottom: 8,
    },
    suggestionFooter: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 8,
    },
    tapHint: {
        fontSize: 11,
        color: '#8B5CF6',
        fontWeight: '500',
    },
});
