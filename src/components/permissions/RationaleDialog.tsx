// ------------------------------------------------------
// 🎨 src/components/permissions/RationaleDialog.tsx
// Permission Rationale Dialog Component
// ------------------------------------------------------

import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import type { PermissionConfig } from '@/services/PermissionManager';

interface RationaleDialogProps {
    visible: boolean;
    permission: PermissionConfig;
    onAccept: () => void;
    onDeny: () => void;
}

export function RationaleDialog({
    visible,
    permission,
    onAccept,
    onDeny,
}: RationaleDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDeny}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.icon}>🔐</Text>

                        <Text style={styles.title}>Permission Required</Text>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Why we need this:</Text>
                            <Text style={styles.rationale}>{permission.rationale}</Text>
                        </View>

                        {permission.requiredForFeature && (
                            <View style={styles.featureBox}>
                                <Text style={styles.featureLabel}>Required for:</Text>
                                <Text style={styles.featureText}>{permission.requiredForFeature}</Text>
                            </View>
                        )}

                        <View style={styles.impactBox}>
                            <Text style={styles.impactLabel}>If denied:</Text>
                            <Text style={styles.impactText}>{permission.impactIfDenied}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonDeny]}
                            onPress={onDeny}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.buttonTextDeny}>Not Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonAccept]}
                            onPress={onAccept}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.buttonTextAccept}>Grant Permission</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    content: {
        padding: 24,
    },
    icon: {
        fontSize: 48,
        textAlign: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    rationale: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    featureBox: {
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    featureLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2E7D32',
        marginBottom: 4,
    },
    featureText: {
        fontSize: 14,
        color: '#1B5E20',
        fontWeight: '500',
    },
    impactBox: {
        backgroundColor: '#FFF3E0',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
    },
    impactLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#E65100',
        marginBottom: 4,
    },
    impactText: {
        fontSize: 14,
        color: '#E65100',
    },
    buttons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDeny: {
        backgroundColor: '#F5F5F5',
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
    },
    buttonAccept: {
        backgroundColor: '#2196F3',
    },
    buttonTextDeny: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    buttonTextAccept: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
