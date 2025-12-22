import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wifi, Signal, SignalLow, SignalZero } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card } from '@/components/ui';

export const NetworkWidget = () => {
    const { status, type, operator, isConnected } = useNetworkStatus();

    let Icon = SignalZero;
    let color = kenyaColors.signalNone;

    if (isConnected) {
        if (status === 'Excellent') {
            Icon = Signal;
            color = kenyaColors.signalExcellent;
        } else if (status === 'Good') {
            Icon = Wifi; // Or medium signal
            color = kenyaColors.signalGood;
        } else {
            Icon = SignalLow;
            color = kenyaColors.signalPoor;
        }
    }

    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>Safaricom Network</Text>
                <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Icon size={16} color={color} />
                    <Text style={[styles.statusText, { color }]}>
                        {status} ({type})
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.operatorText}>{operator || 'Safaricom Kenya'}</Text>
                <Text style={styles.subText}>
                    {status === 'Excellent' ? 'Optimal for Bulk SMS' : 'SMS Delivery may be delayed'}
                </Text>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: kenyaColors.safaricomGreen,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        marginTop: 4,
    },
    operatorText: {
        fontSize: 18,
        fontWeight: '800',
        color: kenyaColors.safaricomGreen,
    },
    subText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
});
