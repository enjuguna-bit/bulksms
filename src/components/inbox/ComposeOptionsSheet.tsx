import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
} from 'react-native';
import { UserPlus, Users, MessageSquarePlus, X } from 'lucide-react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface ComposeOption {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    action: () => void;
}

interface ComposeOptionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onOptionSelect: (optionId: string) => void;
}

export const ComposeOptionsSheet = ({ visible, onClose, onOptionSelect }: ComposeOptionsSheetProps) => {
    const { colors } = useThemeSettings();
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 5,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const options: ComposeOption[] = [
        {
            id: 'single',
            title: 'New Chat',
            subtitle: 'Message a single contact',
            icon: <UserPlus color="#fff" size={24} />,
            action: () => onOptionSelect('single'),
        },
        {
            id: 'bulk',
            title: 'Bulk Message',
            subtitle: 'Send to multiple contacts',
            icon: <MessageSquarePlus color="#fff" size={24} />,
            action: () => onOptionSelect('bulk'),
        },
        {
            id: 'group',
            title: 'New Group',
            subtitle: 'Create a group for frequent messaging',
            icon: <Users color="#fff" size={24} />,
            action: () => onOptionSelect('group'),
        },
    ];

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.sheet,
                                {
                                    backgroundColor: colors.card,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: colors.text }]}>New Message</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X size={20} color={colors.subText} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.optionsList}>
                                {options.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.optionItem, { borderBottomColor: colors.border }]}
                                        onPress={opt.action}
                                    >
                                        <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
                                            {opt.icon}
                                        </View>
                                        <View style={styles.optionText}>
                                            <Text style={[styles.optionTitle, { color: colors.text }]}>
                                                {opt.title}
                                            </Text>
                                            <Text style={[styles.optionSubtitle, { color: colors.subText }]}>
                                                {opt.subtitle}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingTop: 20,
        paddingHorizontal: 16,
        maxHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
    },
    optionsList: {
        gap: 4,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: 13,
    },
});
