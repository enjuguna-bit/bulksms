import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import Contacts from 'react-native-contacts';
import { Search, CheckCircle, Circle, User, Users, ChevronRight, X } from 'lucide-react-native';

import { useThemeSettings } from '@/theme/ThemeProvider';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getAvatarColor, getInitials, ensureContactPermission } from '@/utils/contactUtils';
import { getFixedHeightListProps } from '@/utils/performance/listOptimizations';

interface Contact {
    recordID: string; // Android recordID
    displayName: string;
    phoneNumbers: { label: string; number: string }[];
    thumbnailPath?: string;
}

type SelectionMode = 'single' | 'multiple';

interface ContactPickerParams {
    mode: SelectionMode;
    onSelect?: (contacts: Contact[]) => void; // Optional callback for specialized use
}

export default function ContactPickerScreen({ route, navigation }: any) {
    const { colors } = useThemeSettings();
    const router = useSafeRouter();

    // Params
    const mode: SelectionMode = route?.params?.mode || 'single';

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
    const [permissionDenied, setPermissionDenied] = useState(false);

    // 1. Load Contacts
    useEffect(() => {
        loadContactsSync();
    }, []);

    const loadContactsSync = async () => {
        setLoading(true);
        setPermissionDenied(false);
        try {
            const hasPermission = await ensureContactPermission();
            if (!hasPermission) {
                setPermissionDenied(true);
                setLoading(false);
                return;
            }

            const all = await Contacts.getAll();
            // Sort by display name
            const sorted = all.sort((a, b) =>
                (a.displayName || a.givenName).localeCompare(b.displayName || b.givenName)
            );

            // Normalize structure
            const formatted: Contact[] = sorted.map(c => ({
                recordID: c.recordID,
                displayName: c.displayName || `${c.givenName} ${c.familyName}`.trim() || 'Unknown',
                phoneNumbers: c.phoneNumbers,
                thumbnailPath: c.thumbnailPath,
            })).filter(c => c.phoneNumbers.length > 0); // Only contacts with phones

            setContacts(formatted);
        } catch (e) {
            console.error('Failed to load contacts', e);
        } finally {
            setLoading(false);
        }
    };

    // 2. Filter
    const filteredContacts = useMemo(() => {
        if (!search.trim()) return contacts;
        const q = search.toLowerCase();
        return contacts.filter(c =>
            c.displayName.toLowerCase().includes(q) ||
            c.phoneNumbers.some(p => p.number.includes(q))
        );
    }, [contacts, search]);

    // 3. Selection Logic
    const handleContinue = useCallback((overrideList?: Contact[]) => {
        const finalList = overrideList || contacts.filter(c => selectedMap[c.recordID]);

        if (finalList.length === 0) return;

        if (mode === 'single') {
            const target = finalList[0];
            const phone = target.phoneNumbers[0]?.number; // take first number for now

            // Navigate to Chat
            router.safeReplace("ChatScreen", {
                address: phone,
                threadId: undefined, // Let chat provider resolve
            });
        } else {
            // Bulk Mode - Navigate to BulkSMSPro with selected contacts
            const recipients = finalList.map(c => ({
                address: c.phoneNumbers[0]?.number,
                name: c.displayName
            }));

            router.safeReplace("BulkSMSPro", {
                preselectedContacts: recipients
            });
        }
    }, [contacts, mode, router, selectedMap]);

    const toggleSelection = useCallback((contact: Contact) => {
        if (mode === 'single') {
            // Single Mode: Immediate Action
            handleContinue([contact]);
        } else {
            // Multiple Mode: Toggle
            setSelectedMap(prev => {
                const next = { ...prev };
                if (next[contact.recordID]) {
                    delete next[contact.recordID];
                } else {
                    next[contact.recordID] = true;
                }
                return next;
            });
        }
    }, [mode, handleContinue]);

    const selectedCount = Object.keys(selectedMap).length;

    // 4. Permission Denied UI
    const renderPermissionDenied = () => (
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
            <User size={64} color={colors.subText} style={{ marginBottom: 16 }} />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
                Contacts Permission Required
            </Text>
            <Text style={[styles.permissionMessage, { color: colors.subText }]}>
                BulkSMS needs access to your contacts to help you send messages quickly
            </Text>
            <TouchableOpacity
                style={[styles.permissionButton, { backgroundColor: colors.accent }]}
                onPress={loadContactsSync}
            >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.skipButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={[styles.skipButtonText, { color: colors.subText }]}>Skip for Now</Text>
            </TouchableOpacity>
        </View>
    );

    // 5. Render Item
    const renderItem = ({ item }: { item: Contact }) => {
        const isSelected = !!selectedMap[item.recordID];
        const avatarColor = getAvatarColor(item.recordID);
        const initials = getInitials(item.displayName);

        return (
            <TouchableOpacity
                style={[styles.item, { borderBottomColor: colors.border }]}
                onPress={() => toggleSelection(item)}
            >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.displayName}</Text>
                    <Text style={[styles.phone, { color: colors.subText }]}>
                        {item.phoneNumbers[0]?.number}
                    </Text>
                </View>

                {/* Checkbox (Multi-mode) */}
                {mode === 'multiple' && (
                    <View style={{ marginLeft: 8 }}>
                        {isSelected ? (
                            <CheckCircle color={colors.accent} size={24} fill={colors.chip} />
                        ) : (
                            <Circle color={colors.subText} size={24} />
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Show permission denied UI if needed
    if (permissionDenied) {
        return renderPermissionDenied();
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Search Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
                    <Search size={20} color={colors.subText} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Search contacts..."
                        placeholderTextColor={colors.subText}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={20} color={colors.subText} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredContacts}
                keyExtractor={item => item.recordID}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 100 }}
                {...getFixedHeightListProps(68)}
            />

            {/* Floating Continue Button (Multi-mode only) */}
            {mode === 'multiple' && selectedCount > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.accent }]}
                    onPress={() => handleContinue()}
                >
                    <CheckCircle color="#fff" size={24} style={{ marginRight: 8 }} />
                    <Text style={styles.fabText}>Continue ({selectedCount})</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 22,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    info: { flex: 1 },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    phone: {
        fontSize: 14,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        left: 30,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
    },
    fabText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    permissionButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
        marginBottom: 12,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        padding: 12,
    },
    skipButtonText: {
        fontSize: 14,
    },
});
