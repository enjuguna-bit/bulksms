// -------------------------------------------------------------
// ✨ Smart Compose Button
// -------------------------------------------------------------
// AI-powered button to generate message suggestions

import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View, Text } from 'react-native';

interface SmartComposeButtonProps {
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    remainingGenerations?: number;
}

export function SmartComposeButton({
    onPress,
    loading = false,
    disabled = false,
    remainingGenerations,
}: SmartComposeButtonProps) {
    return (
        <TouchableOpacity
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <>
                    <Text style={styles.icon}>✨</Text>
                    <Text style={styles.label}>AI</Text>
                    {remainingGenerations !== undefined && remainingGenerations < 10 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{remainingGenerations}</Text>
                        </View>
                    )}
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B5CF6', // Purple
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonDisabled: {
        backgroundColor: '#A0A0A0',
        opacity: 0.6,
    },
    icon: {
        fontSize: 16,
    },
    label: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
