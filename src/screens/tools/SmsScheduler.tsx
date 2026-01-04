
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    Alert,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card, Button, Input } from '@/components/ui';
import { KenyaFlag } from '@/components/shared/KenyaFlag';
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { SchedulerService } from '@/services/SchedulerService';

export default function SmsSchedulerScreen() {
    const { colors } = useThemeSettings();
    const router = useSafeRouter();

    const [date, setDate] = useState(new Date());
    const [message, setMessage] = useState('');
    const [recipient, setRecipient] = useState('');
    const [isRepeat, setIsRepeat] = useState(false);
    const [loading, setLoading] = useState(false);

    // Business Hours Logic
    const getIsBusinessHour = (d: Date) => {
        const hours = d.getHours();
        // 8 AM to 5 PM
        return hours >= 8 && hours < 17;
    };

    // Initialize date to next hour
    useEffect(() => {
        const next = new Date();
        next.setHours(next.getHours() + 1);
        next.setMinutes(0);
        setDate(next);
    }, []);

    const handleSchedule = async () => {
        if (!message.trim()) {
            Alert.alert('Error', 'Please enter a message');
            return;
        }
        if (!recipient.trim()) {
            Alert.alert('Error', 'Please select a recipient (Single phone number for now)');
            return;
        }

        // Basic phone validation (placeholder)
        // In fully integrated version, use contact picker result
        if (recipient.length < 10) {
            Alert.alert('Error', 'Invalid phone number format. Use 07... or 254...');
            return;
        }

        const scheduledTime = date.getTime();
        if (scheduledTime <= Date.now()) {
            Alert.alert('Error', 'Please select a future time');
            return;
        }

        try {
            setLoading(true);
            await SchedulerService.scheduleMessage(recipient, message, scheduledTime);

            Alert.alert(
                'Success',
                `SMS Scheduled for ${date.toLocaleString('en-KE')}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to schedule SMS');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

            {/* Timezone Info */}
            <View style={styles.tzContainer}>
                <Text style={{ color: colors.subText, fontSize: 13 }}>
                    Timezone: East Africa Time (UTC+3)
                </Text>
            </View>

            {/* Business Hours Warning */}
            {!getIsBusinessHour(date) && (
                <Card style={[styles.warningCard, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                    <Text style={{ color: '#B91C1C', fontWeight: '700' }}>
                        ⚠ Outside Kenyan business hours (8AM-5PM)
                    </Text>
                </Card>
            )}

            <Card style={styles.card}>
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Recipient (Phone)</Text>
                    <View style={styles.pickerContainer}>
                        <KenyaFlag width={20} height={14} style={{ marginRight: 8 }} />
                        <Input
                            placeholder="0712 345 678"
                            value={recipient}
                            onChangeText={setRecipient}
                            keyboardType="phone-pad"
                            style={{ flex: 1, borderWidth: 0, height: 40 }}
                        />
                    </View>
                    <Text style={{ fontSize: 11, color: colors.subText, marginTop: 4 }}>
                        * Enter single number manually for now. Contact picker integration coming soon.
                    </Text>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Message</Text>
                    <Input
                        placeholder="Enter your message..."
                        multiline
                        numberOfLines={4}
                        value={message}
                        onChangeText={setMessage}
                        style={{ height: 100, textAlignVertical: 'top' }}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Date & Time</Text>
                    <View style={styles.row}>
                        <Button
                            variant="outline"
                            title={date.toLocaleDateString()}
                            onPress={() => {
                                // Mock date advance
                                const nextDay = new Date(date);
                                nextDay.setDate(date.getDate() + 1);
                                setDate(nextDay);
                            }}
                            style={{ flex: 1 }}
                        />
                        <View style={{ width: 8 }} />
                        <Button
                            variant="outline"
                            title={date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            onPress={() => {
                                // Mock time advance + 1 hour
                                const nextHour = new Date(date);
                                nextHour.setHours(date.getHours() + 1);
                                setDate(nextHour);
                            }}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>

                <View style={styles.rowCenter}>
                    <Text style={{ color: colors.text, flex: 1 }}>Repeat Daily</Text>
                    <Switch
                        value={isRepeat}
                        onValueChange={setIsRepeat}
                        trackColor={{ true: kenyaColors.safaricomGreen, false: '#e2e8f0' }}
                        disabled={true} // Feature flag off for initial release
                    />
                </View>

            </Card>

            {/* Scheduling Rules */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Optimization Rules</Text>
            <Card style={styles.rulesCard}>
                <RuleItem label="Avoid weekends (common in Kenya)" checked />
                <RuleItem label="Avoid Kenyan public holidays" checked />
                <RuleItem label="Optimize for SMS cost (off-peak)" checked />
            </Card>

            <Button
                title={loading ? "Scheduling..." : "Schedule SMS"}
                onPress={handleSchedule}
                disabled={loading}
                style={{ marginTop: 24, backgroundColor: kenyaColors.safaricomGreen }}
            />

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const RuleItem = ({ label, checked }: { label: string, checked: boolean }) => (
    <View style={styles.ruleItem}>
        <View style={[styles.checkbox, checked && { backgroundColor: kenyaColors.safaricomGreen }]}>
            {checked && <Text style={{ color: 'white', fontSize: 10 }}>✓</Text>}
        </View>
        <Text style={{ fontSize: 13, color: '#333' }}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flex: 1,
    },
    tzContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    warningCard: {
        padding: 12,
        borderWidth: 1,
        marginBottom: 16,
        borderRadius: 8,
    },
    card: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    pickerButton: {
        paddingVertical: 12,
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },
    rowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 12,
    },
    rulesCard: {
        padding: 16,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
