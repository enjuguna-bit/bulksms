// -------------------------------------------------------------
// 🚨 Specialized Error Screen Component
// -------------------------------------------------------------
// Category-specific error UI with recovery actions

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppError, AppErrorType, RecoveryAction, getRecoveryStrategy, getActionLabel } from '@/utils/errors/AppErrors';

interface Props {
    error: AppError;
    onRecover: (action: RecoveryAction) => void;
}

export function ErrorScreen({ error, onRecover }: Props) {
    const strategy = getRecoveryStrategy(error);

    // Get error-specific visuals
    const getErrorVisuals = () => {
        switch (error.type) {
            case AppErrorType.NETWORK_OFFLINE:
            case AppErrorType.NETWORK_TIMEOUT:
            case AppErrorType.NETWORK_SERVER_ERROR:
                return {
                    icon: '📡',
                    title: 'Connection Problem',
                    color: '#f59e0b',
                    backgroundColor: '#fef3c7',
                };

            case AppErrorType.PERMISSION_SMS:
            case AppErrorType.PERMISSION_CONTACTS:
            case AppErrorType.PERMISSION_STORAGE:
            case AppErrorType.PERMISSION_DENIED:
                return {
                    icon: '🔒',
                    title: 'Permission Needed',
                    color: '#ef4444',
                    backgroundColor: '#fee2e2',
                };

            case AppErrorType.DATA_CORRUPT:
            case AppErrorType.DATABASE_LOCKED:
            case AppErrorType.DATA_MIGRATION_FAILED:
                return {
                    icon: '💾',
                    title: 'Data Error',
                    color: '#dc2626',
                    backgroundColor: '#fecaca',
                };

            case AppErrorType.STORAGE_FULL:
                return {
                    icon: '💿',
                    title: 'Storage Full',
                    color: '#ea580c',
                    backgroundColor: '#fed7aa',
                };

            case AppErrorType.SUBSCRIPTION_EXPIRED:
            case AppErrorType.TRIAL_ENDED:
            case AppErrorType.QUOTA_EXCEEDED:
                return {
                    icon: '⭐',
                    title: 'Subscription Required',
                    color: '#8b5cf6',
                    backgroundColor: '#ede9fe',
                };

            case AppErrorType.UI_RENDER_ERROR:
            case AppErrorType.UI_NAVIGATION_ERROR:
                return {
                    icon: '🎨',
                    title: 'Display Error',
                    color: '#3b82f6',
                    backgroundColor: '#dbeafe',
                };

            default:
                return {
                    icon: '⚠️',
                    title: 'Something Went Wrong',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                };
        }
    };

    const visuals = getErrorVisuals();

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: visuals.backgroundColor }]}>
                <Text style={styles.icon}>{visuals.icon}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{visuals.title}</Text>

            {/* Message */}
            <Text style={styles.message}>
                {typeof error.message === 'string'
                    ? error.message
                    : JSON.stringify(error.message, null, 2)}
            </Text>

            {/* Strategy description */}
            <Text style={styles.description}>{strategy.description}</Text>

            {/* Primary action button */}
            <TouchableOpacity
                onPress={() => onRecover(strategy.primary)}
                style={[styles.primaryButton, { backgroundColor: visuals.color }]}
            >
                <Text style={styles.primaryButtonText}>
                    {getActionLabel(strategy.primary)}
                </Text>
            </TouchableOpacity>

            {/* Secondary actions */}
            {strategy.secondary && strategy.secondary.length > 0 && (
                <View style={styles.secondaryActions}>
                    {strategy.secondary.map((action) => (
                        <TouchableOpacity
                            key={action}
                            onPress={() => onRecover(action)}
                            style={styles.secondaryButton}
                        >
                            <Text style={styles.secondaryButtonText}>
                                {getActionLabel(action)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Dev info */}
            {__DEV__ && error.stack && (
                <View style={styles.devInfo}>
                    <Text style={styles.devInfoTitle}>Debug Info:</Text>
                    <Text style={styles.devInfoText}>
                        {error.stack.split('\n').slice(0, 5).join('\n')}
                    </Text>
                    {error.context?.breadcrumbs && error.context.breadcrumbs.length > 0 && (
                        <>
                            <Text style={[styles.devInfoTitle, { marginTop: 12 }]}>Recent Actions:</Text>
                            <Text style={styles.devInfoText}>
                                {error.context.breadcrumbs
                                    .slice(-5)
                                    .map(b => `• ${b.message}`)
                                    .join('\n')}
                            </Text>
                        </>
                    )}
                </View>
            )}

            {/* Severity indicator */}
            <View style={styles.severityContainer}>
                <Text style={styles.severityText}>
                    Error Type: {error.type}
                </Text>
                <Text style={[
                    styles.severityBadge,
                    error.severity === 'CRITICAL' && styles.severityCritical,
                    error.severity === 'HIGH' && styles.severityHigh,
                    error.severity === 'MEDIUM' && styles.severityMedium,
                    error.severity === 'LOW' && styles.severityLow,
                ]}>
                    {error.severity}
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#ffffff',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 64,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#111827',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    description: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    primaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignSelf: 'stretch',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    secondaryButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    devInfo: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    devInfoTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        marginBottom: 4,
    },
    devInfoText: {
        fontSize: 10,
        color: '#9ca3af',
        fontFamily: 'monospace',
        lineHeight: 16,
    },
    severityContainer: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    severityText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    severityBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    severityCritical: {
        backgroundColor: '#fecaca',
        color: '#991b1b',
    },
    severityHigh: {
        backgroundColor: '#fed7aa',
        color: '#9a3412',
    },
    severityMedium: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    severityLow: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
    },
});
