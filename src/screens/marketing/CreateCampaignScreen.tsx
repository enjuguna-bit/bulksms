import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UnifiedMessageManager } from '@/services/unifiedMessageService';
import { createCampaign } from '@/db/campaigns/repository';
import AiAssistantModal from '@/components/marketing/AiAssistantModal';
import { aiTextService } from '@/services/AiTextService';
import { useThemeSettings } from '@/theme/ThemeProvider';

export default function CreateCampaignScreen() {
    const navigation = useNavigation();
    const [name, setName] = useState('');
    const [recipientsText, setRecipientsText] = useState('');
    const [sending, setSending] = useState(false);

    // AI State
    const [aiVisible, setAiVisible] = useState(false);
    const [aiTarget, setAiTarget] = useState<'single' | 'variantA' | 'variantB'>('single');
    const { colors } = useThemeSettings();

    // A/B Testing State
    const [enableABTest, setEnableABTest] = useState(false);
    const [variantA, setVariantA] = useState('');
    const [variantB, setVariantB] = useState('');
    const [singleBody, setSingleBody] = useState('');

    const openAi = (target: 'single' | 'variantA' | 'variantB') => {
        setAiTarget(target);
        setAiVisible(true);
    };

    const handleAiSelect = (text: string) => {
        if (aiTarget === 'single') setSingleBody(text);
        else if (aiTarget === 'variantA') setVariantA(text);
        else if (aiTarget === 'variantB') setVariantB(text);
    };

    const handleSend = async () => {
        // 1. Validation
        if (!name.trim()) return Alert.alert('Error', 'Campaign name is required');

        const recipients = recipientsText.split(',').map(n => n.trim()).filter(n => n.length > 0);
        if (recipients.length === 0) return Alert.alert('Error', 'No valid recipients');

        let variantsConfig: Record<string, string> | undefined = undefined;
        let body = '';

        if (enableABTest) {
            if (!variantA.trim() || !variantB.trim()) {
                return Alert.alert('Error', 'Both variants A and B are required');
            }
            variantsConfig = { 'A': variantA, 'B': variantB };
            body = 'A/B Test Campaign'; // Placeholder
        } else {
            if (!singleBody.trim()) return Alert.alert('Error', 'Message body is required');
            body = singleBody;
        }

        setSending(true);

        try {
            // 2. Create Campaign in DB
            const campaign = await createCampaign(name, recipients.length, variantsConfig);

            // 3. Start Bulk Send
            UnifiedMessageManager.sendBulk({
                recipients,
                body,
                campaignId: campaign.id,
                variantsConfig,
                onProgress: (p) => {
                    console.log(`Campaign Progress: ${p.percentage}%`);
                }
            });

            Alert.alert('Success', 'Campaign started successfully!');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start campaign');
        } finally {
            setSending(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* AI Bridge (Hidden) */}
            {aiTextService.getPuterWebView()}

            <AiAssistantModal
                visible={aiVisible}
                onClose={() => setAiVisible(false)}
                onSelect={handleAiSelect}
                initialText={
                    aiTarget === 'single' ? singleBody :
                        aiTarget === 'variantA' ? variantA : variantB
                }
            />

            <View style={styles.formGroup}>
                <Text style={styles.label}>Campaign Name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. New Year Promo"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Recipients (comma separated)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={recipientsText}
                    onChangeText={setRecipientsText}
                    placeholder="0712345678, 0722000000"
                    multiline
                    numberOfLines={4}
                />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <Text style={styles.label}>Enable A/B Testing</Text>
                <Switch value={enableABTest} onValueChange={setEnableABTest} />
            </View>

            {enableABTest ? (
                <>
                    <View style={styles.formGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Variant A Message</Text>
                            <TouchableOpacity onPress={() => openAi('variantA')}>
                                <Text style={styles.aiLink}>✨ AI Assist</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={variantA}
                            onChangeText={setVariantA}
                            placeholder="Hello {name}! Check out our offer..."
                            multiline
                        />
                    </View>
                    <View style={styles.formGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Variant B Message</Text>
                            <TouchableOpacity onPress={() => openAi('variantB')}>
                                <Text style={styles.aiLink}>✨ AI Assist</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={variantB}
                            onChangeText={setVariantB}
                            placeholder="Hi there! Special deal for you..."
                            multiline
                        />
                    </View>
                </>
            ) : (
                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Message Body</Text>
                        <TouchableOpacity onPress={() => openAi('single')}>
                            <Text style={styles.aiLink}>✨ AI Assist</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={singleBody}
                        onChangeText={setSingleBody}
                        placeholder="Type your message here..."
                        multiline
                    />
                </View>
            )}

            <TouchableOpacity
                style={[styles.button, sending && styles.buttonDisabled]}
                onPress={handleSend}
                disabled={sending}
            >
                <Text style={styles.buttonText}>{sending ? 'Starting...' : 'Launch Campaign'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontWeight: '600',
        marginBottom: 8,
        color: '#333'
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    aiLink: {
        color: '#8b5cf6',
        fontWeight: 'bold',
        fontSize: 14,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#F9F9F9'
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top'
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 16
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    button: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40
    },
    buttonDisabled: {
        backgroundColor: '#90CAF9'
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
