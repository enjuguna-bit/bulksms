// ------------------------------------------------------
// 🎨 src/components/permissions/PermissionStatusBanner.tsx
// ✅ User-facing permission warning banner
// ------------------------------------------------------

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { AlertCircle, Settings, X } from 'lucide-react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { openAppSettings } from '@/utils/requestPermissions';
import { shouldShowPermissionBanner, dismissPermissionBanner, getBannerStats } from '@/utils/permissionUtils';

interface PermissionStatusBannerProps {
    missingPermissions: string[];
    impactMessage: string;
    bannerKey?: string;
    variant?: 'warning' | 'error' | 'info';
    onDismiss?: () => void;
}

export const PermissionStatusBanner: React.FC<PermissionStatusBannerProps> = ({
    missingPermissions,
    impactMessage,
    bannerKey = 'sms_permissions',
    variant = 'warning',
    onDismiss,
}) => {
    const { colors } = useThemeSettings();
    const [visible, setVisible] = useState(false);
    const [showCount, setShowCount] = useState(0);

    const checkShouldShow = useCallback(async () => {
        if (missingPermissions.length === 0) {
            setVisible(false);
            return;
        }

        const shouldShow = await shouldShowPermissionBanner(bannerKey);
        const stats = await getBannerStats(bannerKey);

        setVisible(shouldShow);
        setShowCount(stats.showCount);
    }, [missingPermissions, bannerKey]);

    useEffect(() => {
        checkShouldShow();
    }, [missingPermissions, checkShouldShow]);

    const handleDismiss = async (permanent: boolean = false) => {
        await dismissPermissionBanner(bannerKey, permanent);
        setVisible(false);
        onDismiss?.();
    };

    const handleOpenSettings = async () => {
        await openAppSettings();
    };

    if (!visible || missingPermissions.length === 0) {
        return null;
    }

    const variantColors = {
        warning: { bg: '#FFF3CD', border: '#FFD700', icon: '#856404' },
        error: { bg: '#F8D7DA', border: '#F5C2C7', icon: '#842029' },
        info: { bg: '#D1ECF1', border: '#BEE5EB', icon: '#0C5460' },
    };

    const variantColor = variantColors[variant];
    const canShowPermanentDismiss = showCount >= 2; // Show "Don't show again" after 2nd view

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: variantColor.bg,
                    borderColor: variantColor.border,
                },
            ]}
        >
            <View style={styles.iconContainer}>
                <AlertCircle size={20} color={variantColor.icon} />
            </View>

            <View style={styles.content}>
                <Text style={[styles.title, { color: variantColor.icon }]}>
                    Missing Permissions
                </Text>
                <Text style={[styles.message, { color: variantColor.icon }]}>
                    {impactMessage}
                </Text>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton, { backgroundColor: variantColor.icon }]}
                        onPress={handleOpenSettings}
                        activeOpacity={0.7}
                    >
                        <Settings size={14} color="#fff" />
                        <Text style={styles.primaryButtonText}>Open Settings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton, { borderColor: variantColor.icon }]}
                        onPress={() => handleDismiss(false)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.secondaryButtonText, { color: variantColor.icon }]}>
                            Dismiss
                        </Text>
                    </TouchableOpacity>
                </View>

                {canShowPermanentDismiss && (
                    <TouchableOpacity
                        style={styles.dontShowButton}
                        onPress={() => handleDismiss(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.dontShowText, { color: variantColor.icon }]}>
                            Don't show again
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleDismiss(false)}
                activeOpacity={0.7}
            >
                <X size={18} color={variantColor.icon} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginHorizontal: 12,
        marginVertical: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    iconContainer: {
        marginRight: 12,
        paddingTop: 2,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        gap: 4,
    },
    primaryButton: {
        flex: 1,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    secondaryButton: {
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    secondaryButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    dontShowButton: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
    },
    dontShowText: {
        fontSize: 11,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
