import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCampaigns, Campaign } from '@/db/campaigns/repository';
import Logger from '@/utils/logger';

export default function CampaignListScreen() {
    const navigation = useNavigation<any>();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await getCampaigns(50, 0);
            setCampaigns(data);
        } catch (e) {
            Logger.error('CampaignList', 'Failed to load campaigns', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCampaigns();
        }, [])
    );

    const renderItem = ({ item }: { item: Campaign }) => {
        const statusColor =
            item.status === 'completed' ? '#4CAF50' :
                item.status === 'failed' ? '#F44336' :
                    item.status === 'running' ? '#2196F3' :
                        '#9E9E9E';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
            >
                <View style={styles.header}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                        <Text style={styles.status}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                <Text style={styles.date}>
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{item.totalRecipients}</Text>
                        <Text style={styles.statLabel}>Target</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={[styles.statVal, { color: '#4CAF50' }]}>{item.sentCount}</Text>
                        <Text style={styles.statLabel}>Sent</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={[styles.statVal, { color: '#F44336' }]}>{item.failedCount}</Text>
                        <Text style={styles.statLabel}>Failed</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={campaigns}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadCampaigns} />
                }
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No campaigns yet</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateCampaign')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    status: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
        color: '#757575',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 12,
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 10,
        color: '#9E9E9E',
        marginTop: 2,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    fabText: {
        color: 'white',
        fontSize: 32,
        lineHeight: 32,
    },
    empty: {
        padding: 40,
        alignItems: 'center'
    },
    emptyText: {
        color: '#999'
    }
});
