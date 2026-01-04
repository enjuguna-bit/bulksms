import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { ArrowLeft, CreditCard, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react-native';
import {
    createLipanaPaymentLink,
    getLipanaTransactions,
    checkLipanaTransactionStatus,
    type LipanaPaymentResponse
} from '@/services/lipanaPayment';

export default function LipanaSettingsScreen() {
    const { colors, theme } = useThemeSettings();
    const router = useSafeRouter();

    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [lastCheck, setLastCheck] = useState<string>('Never');

    // Test Payment State
    const [amount, setAmount] = useState('10');
    const [phone, setPhone] = useState('254700000000');
    const [paymentResult, setPaymentResult] = useState<LipanaPaymentResponse | null>(null);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getLipanaTransactions();
            if (res.success && res.transactions) {
                setTransactions(res.transactions);
                setLastCheck(new Date().toLocaleTimeString());
            } else {
                Alert.alert("Error", res.error || "Failed to fetch transactions");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Unexpected connection error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleCreateTestLink = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert("Invalid Amount", "Please enter a valid number");
            return;
        }

        setLoading(true);
        setPaymentResult(null);
        try {
            const res = await createLipanaPaymentLink({
                title: "Test Payment",
                amount: Number(amount),
                phone: phone,
                currency: "KES"
            });

            setPaymentResult(res);
            if (res.success) {
                Alert.alert("Success", "Payment link created!");
            } else {
                Alert.alert("Failed", res.error || "Unknown error");
            }
        } catch (e) {
            Alert.alert("Error", "Validation failed");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return colors.success || '#10B981'; // Fallback green
            case 'pending': return '#F59E0B';
            case 'failed': return colors.error || '#EF4444'; // Fallback red
            default: return colors.subText;
        }
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: 16,
            color: colors.text
        },
        section: {
            padding: 16,
            paddingBottom: 0
        },
        card: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border
        },
        label: {
            fontSize: 14,
            color: colors.subText,
            marginBottom: 8
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
            color: colors.text,
            marginBottom: 12
        },
        button: {
            backgroundColor: '#2563eb',
            padding: 14,
            borderRadius: 8,
            alignItems: 'center'
        },
        buttonText: {
            color: '#fff',
            fontWeight: 'bold'
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
        },
        txItem: {
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border
        }
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lipana Settings</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Test Section */}
                <View style={styles.section}>
                    <Text style={[styles.label, { fontWeight: 'bold', fontSize: 16, color: colors.text }]}>Test Payment</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>Amount (KES)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Phone (Optional, 254...)</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity
                            style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
                            onPress={handleCreateTestLink}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Payment Link</Text>}
                        </TouchableOpacity>

                        {paymentResult && (
                            <View style={{ marginTop: 16, padding: 12, backgroundColor: paymentResult.success ? '#d1fae5' : '#fee2e2', borderRadius: 8 }}>
                                <Text style={{ color: paymentResult.success ? '#065f46' : '#991b1b', fontWeight: '600' }}>
                                    {paymentResult.success ? 'Link Created Successfully' : 'Creation Failed'}
                                </Text>
                                {paymentResult.success && (
                                    <Text style={{ fontSize: 12, marginTop: 4 }} selectable>{paymentResult.paymentLink}</Text>
                                )}
                                {!paymentResult.success && (
                                    <Text style={{ fontSize: 12, marginTop: 4 }}>{paymentResult.error}</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Transactions Log */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={[styles.label, { fontWeight: 'bold', fontSize: 16, color: colors.text }]}>Recent Transactions</Text>
                        <TouchableOpacity onPress={fetchTransactions} disabled={loading}>
                            <RefreshCw size={20} color="#2563eb" style={{ opacity: loading ? 0.5 : 1 }} />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.subText, marginBottom: 8 }}>Last checked: {lastCheck}</Text>

                    <View style={[styles.card, { paddingVertical: 0 }]}>
                        {transactions.length === 0 ? (
                            <View style={{ padding: 24, alignItems: 'center' }}>
                                <AlertTriangle color={colors.subText} size={32} />
                                <Text style={{ marginTop: 8, color: colors.subText }}>No transactions found</Text>
                            </View>
                        ) : (
                            transactions.map((tx, i) => (
                                <View key={i} style={styles.txItem}>
                                    <View style={styles.row}>
                                        <Text style={{ fontWeight: '600', color: colors.text }}>{tx.title || 'Payment'}</Text>
                                        <Text style={{ fontWeight: 'bold', color: getStatusColor(tx.status) }}>{tx.status}</Text>
                                    </View>
                                    <View style={styles.row}>
                                        <Text style={{ fontSize: 12, color: colors.subText }}>{tx.reference || tx.id}</Text>
                                        <Text style={{ fontSize: 12, color: colors.text }}>{tx.amount} {tx.currency}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
