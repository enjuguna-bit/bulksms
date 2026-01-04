import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { Card } from '@/components/ui';
import { notificationPreferences, type NotificationSettings as Settings } from '@/services/NotificationPreferences';
import { kenyaColors } from '@/theme/kenyaTheme';
import { Bell, BellOff, Moon, Vibrate } from 'lucide-react-native';

export const NotificationSettingsScreen = () => {
    const [settings, setSettings] = useState<Settings>({
        enabled: true,
        showPreview: true,
        vibrate: true,
        sound: true,
        silentHours: {
            enabled: false,
            startHour: 22,
            endHour: 7,
        },
        doNotDisturb: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const loaded = await notificationPreferences.load();
            setSettings(loaded);
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: keyof Settings, value: any) => {
        const updated = { ...settings, [key]: value };
        setSettings(updated);
        await notificationPreferences.save({ [key]: value });
    };

    const updateSilentHours = async (updates: Partial<Settings['silentHours']>) => {
        const updated = {
            ...settings,
            silentHours: { ...settings.silentHours, ...updates },
        };
        setSettings(updated);
        await notificationPreferences.save({ silentHours: updated.silentHours });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Bell size={32} color={kenyaColors.schedulePurple} />
                    <Text style={styles.title}>Notification Settings</Text>
                    <Text style={styles.subtitle}>
                        Customize how your receive message notifications
                    </Text>
                </View>

                {/* Enable Notifications */}
                <Card style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Bell size={20} color={settings.enabled ? kenyaColors.safaricomGreen : '#999'} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Enable Notifications</Text>
                                <Text style={styles.settingDesc}>
                                    Receive in-app notifications for new messages
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(v) => updateSetting('enabled', v)}
                            trackColor={{ true: kenyaColors.safaricomGreen, false: '#e2e8f0' }}
                        />
                    </View>
                </Card>

                {/* Do Not Disturb */}
                <Card style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <BellOff size={20} color={settings.doNotDisturb ? kenyaColors.reportRed : '#999'} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Do Not Disturb</Text>
                                <Text style={styles.settingDesc}>
                                    Mute all notifications temporarily
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.doNotDisturb}
                            onValueChange={(v) => updateSetting('doNotDisturb', v)}
                            trackColor={{ true: kenyaColors.reportRed, false: '#e2e8f0' }}
                            disabled={!settings.enabled}
                        />
                    </View>
                </Card>

                {/* Preview */}
                <Card style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.emoji}>👁️</Text>
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Show Message Preview</Text>
                                <Text style={styles.settingDesc}>
                                    Display message content in notifications
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.showPreview}
                            onValueChange={(v) => updateSetting('showPreview', v)}
                            trackColor={{ true: kenyaColors.safaricomGreen, false: '#e2e8f0' }}
                            disabled={!settings.enabled}
                        />
                    </View>
                </Card>

                {/* Vibrate */}
                <Card style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Vibrate size={20} color={settings.vibrate ? kenyaColors.safaricomGreen : '#999'} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Vibrate</Text>
                                <Text style={styles.settingDesc}>
                                    Vibrate when notification appears
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.vibrate}
                            onValueChange={(v) => updateSetting('vibrate', v)}
                            trackColor={{ true: kenyaColors.safaricomGreen, false: '#e2e8f0' }}
                            disabled={!settings.enabled}
                        />
                    </View>
                </Card>

                {/* Silent Hours */}
                <Card style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Moon size={20} color={settings.silentHours.enabled ? kenyaColors.schedulePurple : '#999'} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Silent Hours</Text>
                                <Text style={styles.settingDesc}>
                                    Silence notifications during specific hours
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.silentHours.enabled}
                            onValueChange={(v) => updateSilentHours({ enabled: v })}
                            trackColor={{ true: kenyaColors.schedulePurple, false: '#e2e8f0' }}
                            disabled={!settings.enabled}
                        />
                    </View>

                    {settings.silentHours.enabled && (
                        <View style={styles.silentHoursConfig}>
                            <View style={styles.timeRow}>
                                <Text style={styles.timeLabel}>Start:</Text>
                                <TouchableOpacity style={styles.timePicker}>
                                    <Text style={styles.timeValue}>
                                        {formatHour(settings.silentHours.startHour)}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.timeRow}>
                                <Text style={styles.timeLabel}>End:</Text>
                                <TouchableOpacity style={styles.timePicker}>
                                    <Text style={styles.timeValue}>
                                        {formatHour(settings.silentHours.endHour)}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.silentHoursHelp}>
                                Currently: {formatHour(settings.silentHours.startHour)} - {formatHour(settings.silentHours.endHour)}
                            </Text>
                        </View>
                    )}
                </Card>

                {/* Reset Button */}
                <TouchableOpacity
                    style={styles.resetButton}
                    onPress={async () => {
                        await notificationPreferences.reset();
                        await loadSettings();
                    }}
                >
                    <Text style={styles.resetButtonText}>Reset to Defaults</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// Helper function to format hour
function formatHour(hour: number): string {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${suffix}`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginTop: 12,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 4,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 40,
    },
    card: {
        padding: 16,
        marginBottom: 12,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    settingDesc: {
        fontSize: 13,
        color: '#666',
    },
    emoji: {
        fontSize: 20,
    },
    silentHoursConfig: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    timePicker: {
        backgroundColor: '#f0f9f0',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: kenyaColors.safaricomGreen,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: kenyaColors.safaricomGreen,
    },
    silentHoursHelp: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    resetButton: {
        backgroundColor: kenyaColors.reportRed,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    resetButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default NotificationSettingsScreen;
