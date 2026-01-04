/**
 * PdfUploader.tsx - PDF file picker component for M-Pesa statements
 * Uses react-native-document-picker for on-device file selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { Upload, FileText, AlertCircle } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';

export interface SelectedPdfFile {
  uri: string;
  name: string;
  type: string | null;
  size: number | null;
  fileCopyUri: string | null;
}

interface PdfUploaderProps {
  onFileSelected: (file: SelectedPdfFile) => void;
  isLoading: boolean;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  onFileSelected,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedPdfFile | null>(null);

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
        copyTo: 'cachesDirectory',
      });

      const doc = res[0];
      const file: SelectedPdfFile = {
        uri: doc.fileCopyUri || doc.uri,
        name: doc.name || 'Unknown.pdf',
        type: doc.type,
        size: doc.size,
        fileCopyUri: doc.fileCopyUri,
      };

      setSelectedFile(file);
      onFileSelected(file);

      Alert.alert(
        'PDF Selected',
        `File: ${file.name}\nSize: ${file.size ? (file.size / 1024).toFixed(2) : 'Unknown'} KB`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        Alert.alert('Error', 'Failed to select PDF file');
        console.error(err);
      }
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.uploadButton,
          isLoading && styles.uploadButtonDisabled,
        ]}
        onPress={pickDocument}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={kenyaColors.safaricomGreen} />
        ) : (
          <>
            <Upload size={32} color={kenyaColors.safaricomGreen} />
            <Text style={styles.uploadText}>Upload M-Pesa Statement PDF</Text>
            <Text style={styles.subText}>Max 10MB • Password Protected</Text>
          </>
        )}
      </TouchableOpacity>

      {selectedFile && (
        <View style={styles.fileInfo}>
          <FileText size={20} color="#666" />
          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(selectedFile.size)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.infoBox}>
        <AlertCircle size={18} color="#666" />
        <Text style={styles.infoText}>
          • PDF must be M-Pesa statement from Safaricom
          {'\n'}
          • Usually requires 6-digit password (e.g., 456378)
          {'\n'}
          • Only "Paid In" amounts above Ksh 5,000 will be extracted
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: kenyaColors.safaricomGreen,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8fff9',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: kenyaColors.safaricomGreen,
    marginTop: 12,
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ffb300',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default PdfUploader;
