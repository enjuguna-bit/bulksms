
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { aiTextService } from '@/services/AiTextService';
import { Sparkles, X, Wand2, ArrowRight } from 'lucide-react-native';

interface AiAssistantModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (text: string) => void;
    initialText: string;
}

type Mode = 'menu' | 'generating' | 'results';

export default function AiAssistantModal({ visible, onClose, onSelect, initialText }: AiAssistantModalProps) {
    const { colors } = useThemeSettings();
    const [mode, setMode] = useState<Mode>('menu');
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [draftText, setDraftText] = useState(initialText);

    const handleAction = async (action: 'rewrite' | 'shorten' | 'ideas') => {
        setMode('generating');
        setLoading(true);

        try {
            let suggestions: string[] = [];

            if (action === 'rewrite') {
                const res = await aiTextService.generateMessageVariation(draftText || 'Example message');
                suggestions = [res];
            } else if (action === 'shorten') {
                const res = await aiTextService.optimizeForSms(draftText || 'Example message');
                suggestions = [res];
            } else if (action === 'ideas') {
                suggestions = await aiTextService.suggestMessages(draftText || 'Marketing Promo', 3);
            }

            setResults(suggestions);
            setMode('results');
        } catch (error: any) {
            console.error(error);
            // Fallback
            setMode('menu');
            alert('AI generation failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setMode('menu');
        setResults([]);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Sparkles size={20} color="#8b5cf6" />
                            <Text style={[styles.title, { color: colors.text }]}>Smart Compose</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={colors.subText} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {mode === 'menu' && (
                            <>
                                <Text style={[styles.label, { color: colors.subText }]}>
                                    What would you like to do with your draft?
                                </Text>

                                <View style={styles.previewBox}>
                                    <TextInput
                                        value={draftText}
                                        onChangeText={setDraftText}
                                        placeholder="Enter your draft text or topic here..."
                                        placeholderTextColor={colors.subText}
                                        multiline
                                        style={[styles.previewInput, { color: colors.text, borderColor: colors.border }]}
                                    />
                                </View>

                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => handleAction('rewrite')}
                                    >
                                        <Wand2 size={20} color="#8b5cf6" />
                                        <View style={styles.actionTextContainer}>
                                            <Text style={[styles.actionTitle, { color: colors.text }]}>Rewrite & Polish</Text>
                                            <Text style={[styles.actionDesc, { color: colors.subText }]}>Make it more engaging</Text>
                                        </View>
                                        <ArrowRight size={16} color={colors.subText} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => handleAction('shorten')}
                                    >
                                        <Text style={{ fontSize: 18 }}>📏</Text>
                                        <View style={styles.actionTextContainer}>
                                            <Text style={[styles.actionTitle, { color: colors.text }]}>Shorten for SMS</Text>
                                            <Text style={[styles.actionDesc, { color: colors.subText }]}>Fit within 160 chars</Text>
                                        </View>
                                        <ArrowRight size={16} color={colors.subText} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => handleAction('ideas')}
                                    >
                                        <Text style={{ fontSize: 18 }}>💡</Text>
                                        <View style={styles.actionTextContainer}>
                                            <Text style={[styles.actionTitle, { color: colors.text }]}>Generate Ideas</Text>
                                            <Text style={[styles.actionDesc, { color: colors.subText }]}>Create new variations</Text>
                                        </View>
                                        <ArrowRight size={16} color={colors.subText} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {mode === 'generating' && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#8b5cf6" />
                                <Text style={[styles.loadingText, { color: colors.subText }]}>
                                    Thinking...
                                </Text>
                            </View>
                        )}

                        {mode === 'results' && (
                            <View style={styles.resultsContainer}>
                                <Text style={[styles.label, { color: colors.subText }]}>
                                    Here are some suggestions:
                                </Text>
                                <ScrollView style={styles.resultsList}>
                                    {results.map((res, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                            onPress={() => {
                                                onSelect(res);
                                                onClose();
                                            }}
                                        >
                                            <Text style={[styles.resultText, { color: colors.text }]}>{res}</Text>
                                            <View style={styles.useBtn}>
                                                <Text style={styles.useBtnText}>Use This</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={reset} style={styles.backBtn}>
                                    <Text style={[styles.backBtnText, { color: colors.primary600 }]}>Try Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        marginBottom: 12,
    },
    previewBox: {
        marginBottom: 20,
    },
    previewInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 16,
    },
    actions: {
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    actionDesc: {
        fontSize: 12,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    resultsContainer: {
        flex: 1,
    },
    resultsList: {
        flex: 1,
    },
    resultCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    resultText: {
        fontSize: 16,
        marginBottom: 12,
        lineHeight: 22,
    },
    useBtn: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignSelf: 'flex-end',
    },
    useBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    backBtn: {
        padding: 16,
        alignItems: 'center',
    },
    backBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
});
