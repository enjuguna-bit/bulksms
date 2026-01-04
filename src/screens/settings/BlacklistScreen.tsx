import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { getBlacklist, removeFromBlacklist, addToBlacklist, OptOutEntry } from '@/db/opt-out/repository';

export default function BlacklistScreen() {
    const [blacklist, setBlacklist] = useState<OptOutEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNumber, setNewNumber] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getBlacklist(100, 0);
            setBlacklist(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAdd = async () => {
        if (!newNumber.trim()) return;
        try {
            await addToBlacklist(newNumber, 'manual');
            setNewNumber('');
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to add number');
        }
    };

    const handleRemove = async (phone: string) => {
        Alert.alert(
            'Remove from Blacklist?',
            `Are you sure you want to allow ${phone} to receive messages again?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await removeFromBlacklist(phone);
                        loadData();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: OptOutEntry }) => (
        <View style={styles.item}>
            <View>
                <Text style={styles.phone}>{item.phoneNumber}</Text>
                <Text style={styles.reason}>Reason: {item.reason}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.phoneNumber)} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={newNumber}
                    onChangeText={setNewNumber}
                    placeholder="Add phone number..."
                    keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                    <Text style={styles.addText}>Block</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={blacklist}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    ListEmptyComponent={<Text style={styles.empty}>No blocked numbers</Text>}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    inputRow: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        alignItems: 'center',
        gap: 12
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#FAFAFA'
    },
    addBtn: {
        backgroundColor: '#F44336',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8
    },
    addText: {
        color: 'white',
        fontWeight: 'bold'
    },
    list: {
        padding: 16
    },
    item: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 1
    },
    phone: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    reason: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    date: {
        fontSize: 10,
        color: '#999',
        marginTop: 4
    },
    removeBtn: {
        padding: 8
    },
    removeText: {
        color: '#2196F3',
        fontWeight: '600'
    },
    empty: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40
    }
});
