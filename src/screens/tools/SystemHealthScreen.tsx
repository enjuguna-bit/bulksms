/**
 * SystemHealthScreen.tsx
 * Diagnostics dashboard for monitoring app, network, and device health.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card, Button } from '@/components/ui';
import {
    Activity,
    Battery,
    Wifi,
    HardDrive,
    Smartphone,
    Signal,
    AlertTriangle,
    CheckCircle
} from 'lucide-react-native';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import ReactNativeBlobUtil from 'react-native-blob-util';

interface HealthStats {
    batteryLevel: number;
    isCharging: boolean;
    freeStorage: string;
    totalStorage: string;
    networkType: string;
    isConnected: boolean;
    ipAddress: string;
    carrier: string;
    brand: string;
    model: string;
    osVersion: string;
    appVersion: string;
    buildNumber: string;
}

export default function SystemHealthScreen() {
    const { colors } = useThemeSettings();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<HealthStats | null>(null);

    const checkHealth = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel fetch for verifyable speed
            const [
                batteryLvl,
                isCharging,
                freeDisk,
                totalDisk,
                netState,
                ip,
                carrier,
            ] = await Promise.all([
                DeviceInfo.getBatteryLevel(),
                DeviceInfo.isBatteryCharging(),
                DeviceInfo.getFreeDiskStorage(),
                DeviceInfo.getTotalDiskCapacity(),
                NetInfo.fetch(),
                DeviceInfo.getIpAddress(),
                DeviceInfo.getCarrier(),
            ]);

            setStats({
                batteryLevel: Math.round(batteryLvl * 100),
                isCharging,
                freeStorage: (freeDisk / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                totalStorage: (totalDisk / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                networkType: netState.type,
                isConnected: !!netState.isConnected,
                ipAddress: ip,
                carrier: carrier,
                brand: DeviceInfo.getBrand(),
                model: DeviceInfo.getModel(),
                osVersion: DeviceInfo.getSystemVersion(),
                appVersion: DeviceInfo.getVersion(),
                buildNumber: DeviceInfo.getBuildNumber(),
            });

        } catch (error) {
            console.error('Diagnostics failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkHealth();
    }, [checkHealth]);

    const HealthRow = ({ label, value, icon: Icon, color = '#666' }: any) => (
        <View style={styles.row}>
            <View style={styles.rowLeft}>
                <Icon size={18} color={color} />
                <Text style={[styles.label, { color: colors.text, marginLeft: 12 }]}>{label}</Text>
            </View>
            <Text style={[styles.value, { color: colors.subText }]}>{value}</Text>
        </View>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={checkHealth} />}
        >
            <View style={styles.header}>
                <Activity size={32} color={kenyaColors.safaricomGreen} />
                <Text style={[styles.title, { color: colors.text }]}>System Diagnostics</Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                    Device health and network status
                </Text>
            </View>

            {/* Network Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Network & Connectivity</Text>
            <Card style={styles.card}>
                <HealthRow
                    label="Status"
                    value={stats?.isConnected ? 'Connected' : 'Offline'}
                    icon={stats?.isConnected ? CheckCircle : AlertTriangle}
                    color={stats?.isConnected ? '#16a34a' : '#dc2626'}
                />
                <View style={styles.divider} />
                <HealthRow
                    label="Connection Type"
                    value={stats?.networkType?.toUpperCase() || 'Unknown'}
                    icon={Wifi}
                    color="#2563eb"
                />
                <View style={styles.divider} />
                <HealthRow
                    label="Carrier"
                    value={stats?.carrier || 'Unknown'}
                    icon={Signal}
                    color={kenyaColors.safaricomGreen}
                />
                <View style={styles.divider} />
                <HealthRow
                    label="IP Address"
                    value={stats?.ipAddress || '-'}
                    icon={Activity}
                    color="#9333ea"
                />
            </Card>

            {/* Device Hardware */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Device Hardware</Text>
            <Card style={styles.card}>
                <HealthRow
                    label="Battery"
                    value={`${stats?.batteryLevel}% ${stats?.isCharging ? '(Charging)' : ''}`}
                    icon={Battery}
                    color={stats?.batteryLevel && stats.batteryLevel < 20 ? '#dc2626' : '#16a34a'}
                />
                <View style={styles.divider} />
                <HealthRow
                    label="Storage Free"
                    value={`${stats?.freeStorage} / ${stats?.totalStorage}`}
                    icon={HardDrive}
                    color="#f59e0b"
                />
                <View style={styles.divider} />
                <HealthRow
                    label="Model"
                    value={`${stats?.brand} ${stats?.model}`}
                    icon={Smartphone}
                    color="#4b5563"
                />
            </Card>

            {/* App Info */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Application Info</Text>
            <Card style={styles.card}>
                <HealthRow
                    label="App Version"
                    value={`v${stats?.appVersion} (${stats?.buildNumber})`}
                    icon={Activity}
                    color="#0891b2"
                />
                <View style={styles.divider} />
                <HealthRow
                    label="Android OS"
                    value={stats?.osVersion}
                    icon={Smartphone}
                    color="#4b5563"
                />
            </Card>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginTop: 12,
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    card: {
        padding: 0, // Reset padding for better dividers
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginLeft: 46, // indent past icon
    }
});
