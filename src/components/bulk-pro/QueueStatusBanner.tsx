// -------------------------------------------------------------
// 📊 QueueStatusBanner - Queue Diagnostics Component
// Shows pending queue count, circuit breaker status, and retry button
// -------------------------------------------------------------

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface QueueStatusBannerProps {
    pending: number;
    failed: number;
    circuitBreakerActive: boolean;
    cooldownRemainingMs: number | null;
    onRetryNow: () => Promise<void>;
    isProcessing?: boolean;
}

const QueueStatusBanner = memo(({
    pending,
    failed,
    circuitBreakerActive,
    cooldownRemainingMs,
    onRetryNow,
    isProcessing = false,
}: QueueStatusBannerProps) => {
    const { colors } = useThemeSettings();

    // Don't show banner if nothing to display
    if (pending === 0 && failed === 0 && !circuitBreakerActive) {
        return null;
    }

    const cooldownSeconds = cooldownRemainingMs
        ? Math.ceil(cooldownRemainingMs / 1000)
        : 0;

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: circuitBreakerActive ? '#fef2f2' : '#fef9c3' },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.statusRow}>
                    <AlertCircle
                        size={18}
                        color={circuitBreakerActive ? '#dc2626' : '#ca8a04'}
                    />
                    <Text
                        style={[
                            styles.statusText,
                            { color: circuitBreakerActive ? '#dc2626' : '#92400e' },
                        ]}
                    >
                        {circuitBreakerActive
                            ? `Circuit breaker active (${cooldownSeconds}s)`
                            : `${pending} pending, ${failed} failed`}
                    </Text>
                </View>

                {pending > 0 && (
                    <Text style={[styles.subText, { color: '#78716c' }]}>
                        Messages queued for retry
                    </Text>
                )}
            </View>

            <TouchableOpacity
                style={[
                    styles.retryButton,
                    {
                        backgroundColor: circuitBreakerActive ? '#dc2626' : colors.accent,
                        opacity: isProcessing || circuitBreakerActive ? 0.5 : 1,
                    },
                ]}
                onPress={onRetryNow}
                disabled={isProcessing || circuitBreakerActive}
            >
                {isProcessing ? (
                    <Loader2 size={16} color="#fff" />
                ) : (
                    <RefreshCw size={16} color="#fff" />
                )}
                <Text style={styles.retryText}>
                    {circuitBreakerActive ? 'Wait' : 'Retry'}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    subText: {
        fontSize: 12,
        marginTop: 2,
        marginLeft: 26,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    retryText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default QueueStatusBanner;
