import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getCampaignStats } from '@/db/campaigns/repository';

type RootStackParamList = {
    CampaignDetail: { campaignId: number };
};

export default function CampaignDetailScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'CampaignDetail'>>();
    const { campaignId } = route.params;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const stats = await getCampaignStats(campaignId);
        setData(stats);
        setLoading(false);
    }, [campaignId]);

    useEffect(() => {
        loadData();
    }, [campaignId, loadData]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text>Campaign not found</Text>
            </View>
        );
    }

    const successRate = data.totalRecipients > 0
        ? Math.round((data.sentCount / data.totalRecipients) * 100)
        : 0;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{data.name}</Text>
                <Text style={styles.date}>Created: {new Date(data.createdAt).toLocaleString()}</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Status: {data.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.grid}>
                    <View style={styles.card}>
                        <Text style={styles.cardVal}>{data.totalRecipients}</Text>
                        <Text style={styles.cardLabel}>Recipients</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={[styles.cardVal, { color: '#4CAF50' }]}>{successRate}%</Text>
                        <Text style={styles.cardLabel}>Success Rate</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    <View style={styles.card}>
                        <Text style={[styles.cardVal, { color: '#2196F3' }]}>{data.sentCount}</Text>
                        <Text style={styles.cardLabel}>Sent</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={[styles.cardVal, { color: '#F44336' }]}>{data.failedCount}</Text>
                        <Text style={styles.cardLabel}>Failed</Text>
                    </View>
                </View>
            </View>

            {/* A/B Testing Results */}
            {data.variantStats && Object.keys(data.variantStats).length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>A/B Test Performance</Text>
                    {Object.entries(data.variantStats).map(([variantId, stats]: [string, any]) => {
                        const content = data.variantsConfig ? data.variantsConfig[variantId] : '';
                        const total = stats.sent + stats.failed;
                        // Note: 'total' here depends on how we query. In repository we grouped by status.
                        // Wait, repository returns { sent: X, failed: Y } per variant.
                        // Actually repository aggregation logic needs to be verified.
                        // Assuming stats = { sent: 10, failed: 2 }

                        const vTotal = stats.sent + stats.failed;
                        // This vTotal is only processed messages. If pending, they won't show.

                        return (
                            <View key={variantId} style={styles.variantCard}>
                                <View style={styles.variantHeader}>
                                    <Text style={styles.variantTitle}>Variant {variantId}</Text>
                                    {/* <Text style={styles.variantWin}>WINNER</Text> */}
                                </View>
                                <Text style={styles.variantContent} numberOfLines={2}>
                                    "{content}"
                                </Text>
                                <View style={styles.variantStats}>
                                    <Text>Sent: {stats.sent}</Text>
                                    <Text>Failed: {stats.failed}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        color: '#888',
        fontSize: 12,
        marginTop: 4
    },
    statusBadge: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: '#E0E0E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555'
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#444'
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    card: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
        elevation: 1
    },
    cardVal: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333'
    },
    cardLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4
    },
    variantCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12
    },
    variantHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    variantTitle: {
        fontWeight: 'bold',
        fontSize: 16
    },
    variantContent: {
        fontStyle: 'italic',
        color: '#666',
        marginBottom: 12
    },
    variantStats: {
        flexDirection: 'row',
        gap: 16
    }
});
