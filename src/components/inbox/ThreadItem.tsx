import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Check, CheckCheck, Clock } from 'lucide-react-native';

import { useThemeSettings } from '@/theme/ThemeProvider';
import { getAvatarColor, getContactName, getInitials, formatWhatsAppTime } from '@/utils/contactUtils';
import { SmsMessageRecord } from '@/native';

interface ThreadItemProps {
    item: SmsMessageRecord;
    onPress: (item: SmsMessageRecord) => void;
    onLongPress: (item: SmsMessageRecord) => void;
}

export const ThreadItem = memo(({ item, onPress, onLongPress }: ThreadItemProps) => {
    const { colors } = useThemeSettings();
    const [displayName, setDisplayName] = useState<string>(item.address || 'Unknown');

    // Resolve contact name asynchronously
    useEffect(() => {
        if (item.address) {
            const resolved = getContactName(item.address);
            if (resolved) {
                setDisplayName(resolved);
            }
        }
    }, [item.address]);

    const initials = getInitials(displayName);
    const avatarColor = getAvatarColor(item.address || '');
    const isMpesa = item.address === 'MPESA' || item.body?.includes('M-PESA');

    // Status indicator logic for outgoing messages
    const renderStatus = () => {
        if (item.type !== 'outgoing') return null;

        // In a real app we'd check delivery reports. 
        // For now we assume 'sent' if it exists.
        return (
            <View style={{ marginRight: 4 }}>
                <CheckCheck size={16} color={colors.accent} />
            </View>
        );
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(item)}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: isMpesa ? '#4ade80' : avatarColor }]}>
                {isMpesa ? (
                    <Text style={[styles.avatarText, { color: '#fff', fontSize: 10 }]}>M-PESA</Text>
                ) : (
                    <Text style={[styles.avatarText, { color: '#fff' }]}>{initials}</Text>
                )}
            </View>

            {/* Content */}
            <View style={[styles.content, { borderBottomColor: colors.border }]}>
                <View style={styles.topRow}>
                    <Text
                        style={[styles.name, { color: colors.text }]}
                        numberOfLines={1}
                    >
                        {displayName}
                    </Text>
                    <Text style={[styles.time, { color: colors.subText }]}>
                        {formatWhatsAppTime(item.timestamp)}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <View style={styles.messageRow}>
                        {renderStatus()}
                        <Text
                            style={[styles.body, { color: colors.subText }]}
                            numberOfLines={1}
                        >
                            {item.body}
                        </Text>
                    </View>

                    {/* Unread Badge (Placeholder for now, until we have real unread counts) */}
                    {/* <View style={[styles.badge, { backgroundColor: '#25D366' }]}>
            <Text style={styles.badgeText}>1</Text>
          </View> */}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        // borderBottomWidth: StyleSheet.hairlineWidth, // divider
        paddingVertical: 4,
        height: '100%',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        marginRight: 16,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 12,
    },
    body: {
        fontSize: 14,
        flex: 1,
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
