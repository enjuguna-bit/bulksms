/**
 * DataExportScreen.tsx
 * Center for exporting application data to CSV/Excel formats.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card, Button } from '@/components/ui';
import { FileText, Download, Share2, Database, MessageSquare } from 'lucide-react-native';
import { runQuery } from '@/db/database/core';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';

export default function DataExportScreen() {
    const { colors } = useThemeSettings();
    const [exporting, setExporting] = useState<string | null>(null);

    /**
     * Generic export handler
     */
    const handleExport = async (type: 'customers' | 'messages' | 'transactions') => {
        setExporting(type);
        try {
            let csvData = '';
            let filename = '';

            if (type === 'customers') {
                const res = await runQuery(`SELECT DISTINCT phone, name FROM payment_records ORDER BY name ASC`);
                csvData = 'Name,Phone\n';
                for (let i = 0; i < res.rows.length; i++) {
                    const row = res.rows.item(i);
                    csvData += `"${row.name || ''}","${row.phone || ''}"\n`;
                }
                filename = `customers_${Date.now()}.csv`;
            } else if (type === 'messages') {
                const res = await runQuery(`SELECT address, body, type, status, timestamp FROM messages ORDER BY timestamp DESC LIMIT 5000`);
                csvData = 'Address,Type,Status,Date,Message\n';
                for (let i = 0; i < res.rows.length; i++) {
                    const row = res.rows.item(i);
                    const date = new Date(row.timestamp).toISOString();
                    const body = (row.body || '').replace(/"/g, '""'); // Escape quotes
                    csvData += `"${row.address}","${row.type}","${row.status}","${date}","${body}"\n`;
                }
                filename = `messages_${Date.now()}.csv`;
            } else if (type === 'transactions') {
                const res = await runQuery(`SELECT phone, rawMessage, lastSeen FROM payment_records ORDER BY lastSeen DESC LIMIT 5000`);
                csvData = 'Phone,Date,RawMessage\n';
                for (let i = 0; i < res.rows.length; i++) {
                    const row = res.rows.item(i);
                    const date = new Date(row.lastSeen).toISOString();
                    const msg = (row.rawMessage || '').replace(/"/g, '""');
                    csvData += `"${row.phone}","${date}","${msg}"\n`;
                }
                filename = `transactions_${Date.now()}.csv`;
            }

            // Write and Share
            const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
            await ReactNativeBlobUtil.fs.writeFile(path, csvData, 'utf8');

            await Share.open({
                title: `Export ${type}`,
                url: `file://${path}`,
                type: 'text/csv',
                failOnCancel: false,
            });

        } catch (error) {
            console.error('Export failed:', error);
            Alert.alert('Export Failed', 'Could not generate the export file.');
        } finally {
            setExporting(null);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

            <View style={styles.header}>
                <Database size={32} color={kenyaColors.safaricomGreen} />
                <Text style={[styles.title, { color: colors.text }]}>Data Export Center</Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                    Backup and share your data in CSV format
                </Text>
            </View>

            <View style={styles.grid}>
                {/* Customers Export */}
                <Card style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                        <FileText size={24} color="#2563eb" />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Customer List</Text>
                        <Text style={[styles.cardDesc, { color: colors.subText }]}>
                            Export names and phone numbers
                        </Text>
                        <Button
                            title={exporting === 'customers' ? "Exporting..." : "Export CSV"}
                            variant="outline"
                            size="sm"
                            onPress={() => handleExport('customers')}
                            disabled={!!exporting}
                            style={{ marginTop: 8 }}
                        />
                    </View>
                </Card>

                {/* Messages Export */}
                <Card style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                        <MessageSquare size={24} color={kenyaColors.safaricomGreen} />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>SMS Archives</Text>
                        <Text style={[styles.cardDesc, { color: colors.subText }]}>
                            Export message history (Last 5k)
                        </Text>
                        <Button
                            title={exporting === 'messages' ? "Exporting..." : "Export CSV"}
                            variant="outline"
                            size="sm"
                            onPress={() => handleExport('messages')}
                            disabled={!!exporting}
                            style={{ marginTop: 8 }}
                        />
                    </View>
                </Card>

                {/* Transactions Export */}
                <Card style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                        <Database size={24} color="#d97706" />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Transactions</Text>
                        <Text style={[styles.cardDesc, { color: colors.subText }]}>
                            Export M-Pesa records (Last 5k)
                        </Text>
                        <Button
                            title={exporting === 'transactions' ? "Exporting..." : "Export CSV"}
                            variant="outline"
                            size="sm"
                            onPress={() => handleExport('transactions')}
                            disabled={!!exporting}
                            style={{ marginTop: 8 }}
                        />
                    </View>
                </Card>
            </View>

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
    grid: {
        gap: 16,
    },
    card: {
        flexDirection: 'row', // Use explicit row layout
        padding: 16,
        alignItems: 'center',
        flexWrap: 'wrap', // Allow wrapping
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        flexBasis: 150, // Added min width assumption for flexbox
        minWidth: 150,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardDesc: {
        fontSize: 13,
        marginBottom: 4,
    },
});
