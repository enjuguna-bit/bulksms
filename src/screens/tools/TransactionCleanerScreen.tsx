/**
 * TransactionCleanerScreen.tsx
 * Scans and removes duplicate M-Pesa transactions from the database.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card, Button } from '@/components/ui';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Trash2, Search, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { runQuery } from '@/db/database/core';
import {
    findDuplicateGroups,
    deduplicateMessages,
} from '@/utils/transactionDeduplication';

interface DuplicateGroup {
    ids: number[];
    phone: string;
    count: number;
    sample: string;
}

export default function TransactionCleanerScreen() {
    const { colors } = useThemeSettings();
    const router = useSafeRouter();

    const [scanning, setScanning] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [totalScanned, setTotalScanned] = useState(0);
    const [cleaned, setCleaned] = useState(false);

    /**
     * Scan for duplicates in the database
     */
    const handleScan = useCallback(async () => {
        setScanning(true);
        setCleaned(false);
        setDuplicates([]);

        try {
            // Fetch all payment records
            const res = await runQuery(
                `SELECT id, phone, rawMessage AS message, lastSeen AS timestamp FROM payment_records ORDER BY lastSeen DESC`
            );

            const messages: Array<{ id: number; message: string; phone: string; timestamp: number }> = [];
            for (let i = 0; i < res.rows.length; i++) {
                const row = res.rows.item(i);
                messages.push({
                    id: row.id,
                    message: row.message || '',
                    phone: row.phone || '',
                    timestamp: row.timestamp || 0,
                });
            }

            setTotalScanned(messages.length);

            // Find duplicate groups using the util
            const groups = findDuplicateGroups(
                messages.map(m => ({ message: m.message, phone: m.phone, timestamp: m.timestamp })),
                300000 // 5 minute window
            );

            // Map back to IDs for deletion
            const duplicateGroups: DuplicateGroup[] = groups.map(group => {
                const matchingIds = group.map(g => {
                    const match = messages.find(m => m.message === g.message && m.phone === g.phone && m.timestamp === g.timestamp);
                    return match?.id || 0;
                }).filter(id => id > 0);

                return {
                    ids: matchingIds.slice(1), // Keep first, mark rest as duplicates
                    phone: group[0].phone,
                    count: group.length,
                    sample: group[0].message.substring(0, 50) + '...',
                };
            }).filter(g => g.ids.length > 0);

            setDuplicates(duplicateGroups);

        } catch (error) {
            console.error('Scan failed:', error);
            Alert.alert('Error', 'Failed to scan for duplicates');
        } finally {
            setScanning(false);
        }
    }, []);

    /**
     * Delete all detected duplicates
     */
    const handleClean = useCallback(async () => {
        if (duplicates.length === 0) return;

        Alert.alert(
            'Confirm Cleanup',
            `This will permanently delete ${duplicates.reduce((a, g) => a + g.ids.length, 0)} duplicate records. Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setCleaning(true);
                        try {
                            let deletedCount = 0;
                            for (const group of duplicates) {
                                for (const id of group.ids) {
                                    await runQuery(`DELETE FROM payment_records WHERE id = ?`, [id]);
                                    deletedCount++;
                                }
                            }

                            Alert.alert('Success', `Removed ${deletedCount} duplicate records.`);
                            setDuplicates([]);
                            setCleaned(true);
                        } catch (error) {
                            console.error('Cleanup failed:', error);
                            Alert.alert('Error', 'Failed to clean duplicates');
                        } finally {
                            setCleaning(false);
                        }
                    },
                },
            ]
        );
    }, [duplicates]);

    const totalDuplicates = duplicates.reduce((a, g) => a + g.ids.length, 0);

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Trash2 size={32} color={kenyaColors.statRed} />
                <Text style={[styles.title, { color: colors.text }]}>Transaction Cleaner</Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                    Find and remove duplicate M-Pesa records
                </Text>
            </View>

            {/* Scan Button */}
            <Button
                title={scanning ? 'Scanning...' : 'Scan for Duplicates'}
                onPress={handleScan}
                disabled={scanning || cleaning}
                style={{ backgroundColor: kenyaColors.safaricomGreen, marginBottom: 16 }}
            />

            {/* Results Card */}
            {totalScanned > 0 && (
                <Card style={styles.resultsCard}>
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>Records Scanned:</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalScanned}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>Duplicates Found:</Text>
                        <Text style={[styles.statValue, { color: totalDuplicates > 0 ? kenyaColors.statRed : kenyaColors.safaricomGreen }]}>
                            {totalDuplicates}
                        </Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>Duplicate Groups:</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{duplicates.length}</Text>
                    </View>
                </Card>
            )}

            {/* Status Message */}
            {cleaned && (
                <Card style={[styles.statusCard, { backgroundColor: '#dcfce7', borderColor: '#22c55e' }]}>
                    <CheckCircle size={20} color="#22c55e" />
                    <Text style={{ color: '#166534', marginLeft: 8, fontWeight: '600' }}>
                        Database cleaned successfully!
                    </Text>
                </Card>
            )}

            {/* Duplicate Groups List */}
            {duplicates.length > 0 && (
                <View style={{ marginTop: 16 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Duplicate Groups</Text>
                    {duplicates.slice(0, 10).map((group, idx) => (
                        <Card key={idx} style={styles.groupCard}>
                            <View style={styles.groupHeader}>
                                <AlertTriangle size={16} color={kenyaColors.mpesa} />
                                <Text style={[styles.groupPhone, { color: colors.text }]}>{group.phone}</Text>
                                <Text style={[styles.groupCount, { color: kenyaColors.statRed }]}>
                                    {group.count} copies
                                </Text>
                            </View>
                            <Text style={[styles.groupSample, { color: colors.subText }]} numberOfLines={2}>
                                {group.sample}
                            </Text>
                        </Card>
                    ))}
                    {duplicates.length > 10 && (
                        <Text style={{ color: colors.subText, textAlign: 'center', marginTop: 8 }}>
                            + {duplicates.length - 10} more groups
                        </Text>
                    )}
                </View>
            )}

            {/* Clean Button */}
            {totalDuplicates > 0 && (
                <Button
                    title={cleaning ? 'Cleaning...' : `Remove ${totalDuplicates} Duplicates`}
                    onPress={handleClean}
                    disabled={scanning || cleaning}
                    style={{ backgroundColor: kenyaColors.statRed, marginTop: 24 }}
                />
            )}

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
    resultsCard: {
        padding: 16,
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 14,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    groupCard: {
        padding: 12,
        marginBottom: 8,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    groupPhone: {
        fontWeight: '600',
        marginLeft: 8,
        flex: 1,
    },
    groupCount: {
        fontWeight: '700',
        fontSize: 12,
    },
    groupSample: {
        fontSize: 12,
    },
});
