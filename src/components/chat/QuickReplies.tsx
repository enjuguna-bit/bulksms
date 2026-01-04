import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface QuickRepliesProps {
    onSelect: (text: string) => void;
}

const KENYAN_REPLIES = [
    "Sawa",
    "Asante",
    "Niko njiani",
    "Nitumie pesa",
    "Nitakupigia",
    "Poa",
    "Kuja",
    "Pesa imeingia?",
    "Please call me",
    "Ok",
];

export const QuickReplies = ({ onSelect }: QuickRepliesProps) => {
    const { colors } = useThemeSettings();

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {KENYAN_REPLIES.map((reply, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.chip, { backgroundColor: colors.chip, borderColor: colors.border }]}
                        onPress={() => onSelect(reply)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.text, { color: colors.text }]}>{reply}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 48,
        marginBottom: 4,
    },
    scrollContent: {
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
    },
});
