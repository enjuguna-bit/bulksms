/**
 * PasswordModal.tsx - Password input modal for encrypted M-Pesa PDFs
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Lock, X, Eye, EyeOff } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';

interface PasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isLoading: boolean;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setShowPassword(false);
    }
  }, [visible]);

  useEffect(() => {
    if (lockoutUntil) {
      const timer = setInterval(() => {
        if (Date.now() >= lockoutUntil) {
          setLockoutUntil(null);
          setAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutUntil]);

  const handleSubmit = () => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      Alert.alert(
        'Too Many Attempts',
        `Please wait ${remainingSeconds} seconds before trying again`
      );
      return;
    }

    if (password.length < 4) {
      Alert.alert('Invalid Password', 'Please enter at least 4 characters');
      return;
    }

    if (attempts >= 3) {
      setLockoutUntil(Date.now() + 5 * 60 * 1000); // 5 minute lockout
      Alert.alert(
        'Too Many Attempts',
        'Please wait 5 minutes before trying again'
      );
      return;
    }

    setAttempts(prev => prev + 1);
    onSubmit(password);
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
  const canSubmit = password.length >= 4 && !isLoading && !isLocked;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Lock size={24} color={kenyaColors.safaricomGreen} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Enter PDF Password</Text>
          <Text style={styles.subtitle}>
            M-Pesa statements require a password provided by Safaricom (usually 6 digits)
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#999"
              keyboardType="default"
              maxLength={20}
              secureTextEntry={!showPassword}
              autoFocus
              editable={!isLoading && !isLocked}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Usually your birth date (DDMMYY) or a 6-digit code like 000000
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Decrypting...' : 'Decrypt PDF'}
              </Text>
            </TouchableOpacity>
          </View>

          {attempts > 0 && !isLocked && (
            <Text style={styles.attempts}>
              Attempts: {attempts}/3 • Lockout after 3 failed attempts
            </Text>
          )}

          {isLocked && (
            <Text style={styles.lockoutText}>
              Too many attempts. Please wait before trying again.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: kenyaColors.safaricomGreen,
    borderRadius: 12,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 4,
  },
  eyeButton: {
    padding: 16,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: kenyaColors.safaricomGreen,
  },
  submitButtonDisabled: {
    backgroundColor: '#a0d9a0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  attempts: {
    fontSize: 11,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 16,
  },
  lockoutText: {
    fontSize: 12,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});

export default PasswordModal;
