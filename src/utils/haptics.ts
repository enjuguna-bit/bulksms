import { Platform } from 'react-native';

export interface HapticFeedback {
  light(): void;
  medium(): void;
  heavy(): void;
  success(): void;
  warning(): void;
  error(): void;
  selection(): void;
}

class HapticFeedbackImpl implements HapticFeedback {
  private isAvailable: boolean = false;

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability() {
    try {
      if (Platform.OS === 'ios') {
        // For iOS, we'll use react-native-haptic-feedback if available
        // For now, we'll implement a basic version
        this.isAvailable = true;
      } else if (Platform.OS === 'android') {
        // For Android, we'll use react-native-haptic-feedback if available
        // For now, we'll implement a basic version
        this.isAvailable = true;
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
      this.isAvailable = false;
    }
  }

  light(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS light haptic - would use expo-haptics or react-native-haptic-feedback
        // For now, this is a placeholder
      } else if (Platform.OS === 'android') {
        // Android light haptic
        // For now, this is a placeholder
      }
    } catch (error) {
      console.warn('Failed to trigger light haptic:', error);
    }
  }

  medium(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS medium haptic
      } else if (Platform.OS === 'android') {
        // Android medium haptic
      }
    } catch (error) {
      console.warn('Failed to trigger medium haptic:', error);
    }
  }

  heavy(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS heavy haptic
      } else if (Platform.OS === 'android') {
        // Android heavy haptic
      }
    } catch (error) {
      console.warn('Failed to trigger heavy haptic:', error);
    }
  }

  success(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS success haptic
      } else if (Platform.OS === 'android') {
        // Android success haptic
      }
    } catch (error) {
      console.warn('Failed to trigger success haptic:', error);
    }
  }

  warning(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS warning haptic
      } else if (Platform.OS === 'android') {
        // Android warning haptic
      }
    } catch (error) {
      console.warn('Failed to trigger warning haptic:', error);
    }
  }

  error(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS error haptic
      } else if (Platform.OS === 'android') {
        // Android error haptic
      }
    } catch (error) {
      console.warn('Failed to trigger error haptic:', error);
    }
  }

  selection(): void {
    if (!this.isAvailable) return;
    
    try {
      if (Platform.OS === 'ios') {
        // iOS selection haptic
      } else if (Platform.OS === 'android') {
        // Android selection haptic
      }
    } catch (error) {
      console.warn('Failed to trigger selection haptic:', error);
    }
  }
}

export const haptics = new HapticFeedbackImpl();
