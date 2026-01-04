/**
 * MpesaParserScreen.tsx - Main screen for M-Pesa PDF statement parsing
 * 
 * Features:
 * - PDF file selection from device
 * - Password-protected PDF decryption
 * - Transaction extraction and filtering
 * - Export to CSV/JSON
 * - Share functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { 
  PdfUploader, 
  PasswordModal, 
  ResultsTable,
  type SelectedPdfFile 
} from '@/components/MpesaParser';
import {
  mpesaPdfParserService,
  type MpesaPdfTransaction,
  type ParseResult,
} from '@/services/mpesaPdfParserService';
import Share from 'react-native-share';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { 
  RefreshCw, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react-native';

type ParserMode = 'pdf' | 'text';

export default function MpesaParserScreen() {
  const { colors } = useThemeSettings();
  
  const [pdfFile, setPdfFile] = useState<SelectedPdfFile | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [transactions, setTransactions] = useState<MpesaPdfTransaction[]>([]);
  const [parserMode, setParserMode] = useState<ParserMode>('pdf');
  const [manualText, setManualText] = useState('');

  const handleFileSelected = useCallback((file: SelectedPdfFile) => {
    setPdfFile(file);
    setPasswordModalVisible(true);
  }, []);

  const handlePasswordSubmit = useCallback(async (password: string) => {
    if (!pdfFile) return;

    setIsParsing(true);
    setPasswordModalVisible(false);

    try {
      const result = await mpesaPdfParserService.parsePdfStatement(
        pdfFile.uri,
        password
      );

      if (result.success) {
        setParseResult(result);
        setTransactions(result.transactions);

        Alert.alert(
          'Success',
          `Parsed ${result.totalProcessed} transactions, found ${result.highValueCount} above Ksh 5,000`,
          [{ text: 'OK' }]
        );
      } else {
        // Check if it's a "needs native library" error
        if (result.error?.includes('native integration')) {
          Alert.alert(
            'PDF Parsing Not Available',
            'Password-protected PDF parsing requires native integration. You can:\n\n' +
            '1. Use the "Paste Text" mode to manually paste extracted text\n' +
            '2. Install a PDF parsing library for full functionality',
            [
              { text: 'Use Text Mode', onPress: () => setParserMode('text') },
              { text: 'OK', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to parse PDF');
        }
        setParseResult(null);
        setTransactions([]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process PDF');
      setParseResult(null);
      setTransactions([]);
    } finally {
      setIsParsing(false);
    }
  }, [pdfFile]);

  const handleParseManualText = useCallback(async () => {
    if (!manualText.trim()) {
      Alert.alert('Error', 'Please paste some M-Pesa statement text first');
      return;
    }

    setIsParsing(true);

    try {
      const result = await mpesaPdfParserService.parseExtractedText(manualText);

      if (result.success) {
        setParseResult(result);
        setTransactions(result.transactions);

        Alert.alert(
          'Success',
          `Parsed ${result.totalProcessed} transactions, found ${result.highValueCount} above Ksh 5,000`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to parse text');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to parse text');
    } finally {
      setIsParsing(false);
    }
  }, [manualText]);

  const handleExport = useCallback(async (format: 'csv' | 'json' | 'excel') => {
    try {
      let filePath: string;

      if (format === 'csv') {
        filePath = await mpesaPdfParserService.exportToCsv(transactions);
      } else if (format === 'excel') {
        filePath = await mpesaPdfParserService.exportToExcel(transactions);
      } else {
        filePath = await mpesaPdfParserService.exportToJson(transactions);
      }

      Alert.alert(
        'Export Complete',
        `File saved to: ${filePath}\n\nWould you like to share it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              try {
                const mimeType = format === 'json' ? 'application/json' : 'text/csv';
                await Share.open({
                  url: `file://${filePath}`,
                  type: mimeType,
                });
              } catch (shareError) {
                console.error('Share error:', shareError);
                Alert.alert('Error', 'Failed to share file, but it was saved successfully');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        error.message || 'Failed to export data. Please check file permissions.',
        [
          { text: 'OK' },
          {
            text: 'Check Permissions',
            onPress: () => {
              // Could open app settings here
            },
          },
        ]
      );
    }
  }, [transactions]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Parser',
      'Clear current results and start over?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPdfFile(null);
            setParseResult(null);
            setTransactions([]);
            setManualText('');
          },
        },
      ]
    );
  }, []);

  const renderModeToggle = () => (
    <View style={styles.modeToggle}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          parserMode === 'pdf' && styles.modeButtonActive,
        ]}
        onPress={() => setParserMode('pdf')}
      >
        <FileText 
          size={16} 
          color={parserMode === 'pdf' ? '#fff' : '#666'} 
        />
        <Text
          style={[
            styles.modeButtonText,
            parserMode === 'pdf' && styles.modeButtonTextActive,
          ]}
        >
          Upload PDF
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.modeButton,
          parserMode === 'text' && styles.modeButtonActive,
        ]}
        onPress={() => setParserMode('text')}
      >
        <FileText 
          size={16} 
          color={parserMode === 'text' ? '#fff' : '#666'} 
        />
        <Text
          style={[
            styles.modeButtonText,
            parserMode === 'text' && styles.modeButtonTextActive,
          ]}
        >
          Paste Text
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTextInput = () => (
    <View style={styles.textInputContainer}>
      <Text style={styles.textInputLabel}>
        Paste M-Pesa statement text below:
      </Text>
      <TextInput
        style={styles.textInput}
        value={manualText}
        onChangeText={setManualText}
        placeholder="Paste the text content from your M-Pesa statement here..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={10}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[
          styles.parseButton,
          (!manualText.trim() || isParsing) && styles.parseButtonDisabled,
        ]}
        onPress={handleParseManualText}
        disabled={!manualText.trim() || isParsing}
      >
        {isParsing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.parseButtonText}>Parse Text</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Info size={16} color="#666" />
        <Text style={styles.infoCardText}>
          Copy text from your M-Pesa statement PDF (you can use any PDF reader to extract text) and paste it here for parsing.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>M-Pesa Statement Parser</Text>
          <Text style={styles.subtitle}>
            Extract high-value transactions (Ksh 5,000+) from M-Pesa statements
          </Text>
        </View>

        {/* Mode Toggle */}
        {renderModeToggle()}

        {/* Upload or Text Input Section */}
        {parserMode === 'pdf' ? (
          <PdfUploader
            onFileSelected={handleFileSelected}
            isLoading={isParsing}
          />
        ) : (
          renderTextInput()
        )}

        {/* Results Section */}
        {isParsing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={kenyaColors.safaricomGreen} />
            <Text style={styles.loadingText}>
              Parsing statement...
              {'\n'}
              This may take a moment for large files
            </Text>
          </View>
        ) : transactions.length > 0 ? (
          <ResultsTable
            transactions={transactions}
            stats={parseResult?.stats}
            onExport={handleExport}
          />
        ) : parseResult?.success === false ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={24} color="#d32f2f" />
            <Text style={styles.errorText}>{parseResult.error}</Text>
            <Text style={styles.errorHint}>
              • Make sure the PDF is a valid M-Pesa statement
              {'\n'}
              • Check that the password is correct (usually 6 digits)
              {'\n'}
              • Try using the "Paste Text" mode instead
            </Text>
          </View>
        ) : null}

        {/* Success indicator when we have results */}
        {transactions.length > 0 && (
          <View style={styles.successBanner}>
            <CheckCircle size={20} color={kenyaColors.safaricomGreen} />
            <Text style={styles.successText}>
              Found {transactions.length} high-value transactions
            </Text>
          </View>
        )}

        {/* Reset Button */}
        {(pdfFile || transactions.length > 0 || manualText) && !isParsing && (
          <View style={styles.resetContainer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <RefreshCw size={16} color="#666" />
              <Text style={styles.resetButtonText}>Reset & Start Over</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Password Modal */}
      <PasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        onSubmit={handlePasswordSubmit}
        isLoading={isParsing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    backgroundColor: kenyaColors.safaricomGreen,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: kenyaColors.safaricomGreen,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  textInputContainer: {
    padding: 20,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    minHeight: 200,
    marginBottom: 16,
  },
  parseButton: {
    backgroundColor: kenyaColors.safaricomGreen,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  parseButtonDisabled: {
    backgroundColor: '#a0d9a0',
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0288d1',
    gap: 8,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    alignItems: 'flex-start',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
  },
  errorHint: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f7eb',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: kenyaColors.safaricomGreen,
  },
  resetContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
