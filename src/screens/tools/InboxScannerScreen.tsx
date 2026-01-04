
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { InboxScannerService, ParsedTransaction } from '@/services/InboxScannerService';
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';

export default function InboxScannerScreen() {
    const { colors } = useThemeSettings();
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
    const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, count: 0 });
    const [scanProgress, setScanProgress] = useState(0);

    const loadData = useCallback(async () => {
        try {
            const [txs, sts] = await Promise.all([
                InboxScannerService.getRecentTransactions(20),
                InboxScannerService.getStats()
            ]);
            setTransactions(txs);
            setStats(sts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleScan = async () => {
        if (scanning) return;
        setScanning(true);
        setScanProgress(0);

        try {
            const result = await InboxScannerService.scanInboxAndImport(500, (current, total) => {
                setScanProgress(Math.round((current / total) * 100));
            });

            Alert.alert(
                'Scan Complete',
                `Added: ${result.added}\nSkipped: ${result.skipped}\nErrors: ${result.errors}`
            );
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Scan failed: ' + (e as Error).message);
        } finally {
            setScanning(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
    };

    const renderTransaction = ({ item }: { item: ParsedTransaction }) => (
        <View style={[styles.txItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.txIcon}>
                {item.type === 'INCOMING' ? (
                    <TrendingUp color={kenyaColors.safaricomGreen} size={24} />
                ) : (
                    <TrendingDown color={colors.error} size={24} />
                )}
            </View>
            <View style={styles.txDetails}>
                <Text style={[styles.txName, { color: colors.text }]}>{item.partyName || 'Unknown'}</Text>
                <Text style={[styles.txDate, { color: colors.subText }]}>
                    {new Date(item.timestamp).toLocaleString()} • {item.provider}
                </Text>
            </View>
            <View style={styles.txAmount}>
                <Text style={[
                    styles.amountText,
                    { color: item.type === 'INCOMING' ? kenyaColors.safaricomGreen : colors.error }
                ]}>
                    {item.type === 'INCOMING' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header / Scan Control */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Financial Scanner</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
                        {stats.count} transactions found
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
                    onPress={handleScan}
                    disabled={scanning}
                >
                    {scanning ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <RefreshCw color="white" size={18} />
                    )}
                    <Text style={styles.scanBtnText}>
                        {scanning ? `${scanProgress}%` : 'Scan Inbox'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#e8f7eb' }]}>
                    <Text style={[styles.statLabel, { color: '#2e7d32' }]}>Total Income</Text>
                    <Text style={[styles.statValue, { color: '#1b5e20' }]}>{formatCurrency(stats.totalIncome)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#ffebee' }]}>
                    <Text style={[styles.statLabel, { color: '#c62828' }]}>Total Spent</Text>
                    <Text style={[styles.statValue, { color: '#b71c1c' }]}>{formatCurrency(stats.totalExpense)}</Text>
                </View>
            </View>

            {/* Recent Transactions */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>

            {loading && !scanning ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Clock size={40} color={colors.subText} />
                            <Text style={[styles.emptyText, { color: colors.subText }]}>
                                No transactions found yet. Try scanning your inbox.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    scanBtn: {
        flexDirection: 'row',
        backgroundColor: '#2563eb',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        gap: 6,
    },
    scanBtnDisabled: {
        opacity: 0.7,
    },
    scanBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    statsRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 16,
        marginBottom: 8,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    txItem: {
        flexDirection: 'row',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    txIcon: {
        marginRight: 12,
        width: 40,
        alignItems: 'center',
    },
    txDetails: {
        flex: 1,
    },
    txName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    txDate: {
        fontSize: 12,
    },
    txAmount: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
