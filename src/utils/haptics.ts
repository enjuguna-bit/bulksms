import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
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
        // iOS haptic feedback is available
        this.isAvailable = true;
      } else if (Platform.OS === 'android') {
        // Android haptic feedback is available
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
      ReactNativeHapticFeedback.trigger('impactLight');
    } catch (error) {
      console.warn('Failed to trigger light haptic:', error);
    }
  }

  medium(): void {
    if (!this.isAvailable) return;

    try {
      ReactNativeHapticFeedback.trigger('impactMedium');
    } catch (error) {
      console.warn('Failed to trigger medium haptic:', error);
    }
  }

  heavy(): void {
    if (!this.isAvailable) return;

    try {
      ReactNativeHapticFeedback.trigger('impactHeavy');
    } catch (error) {
      console.warn('Failed to trigger heavy haptic:', error);
    }
  }

  success(): void {
    if (!this.isAvailable) return;

    try {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } catch (error) {
      console.warn('Failed to trigger success haptic:', error);
    }
  }

  warning(): void {
    if (!this.isAvailable) return;

    try {
      ReactNativeHapticFeedback.trigger('notificationWarning');
    } catch (error) {
      console.warn('Failed to trigger warning haptic:', error);
    }
  }

  error(): void {
    if (!this.isAvailable) return;

    try {
      ReactNativeHapticFeedback.trigger('notificationError');
    } catch (error) {
      console.warn('Failed to trigger error haptic:', error);
    }
  }

  selection(): void {
    if (!this.isAvailable) return;

    try {
      ReactNativeHapticFeedback.trigger('selection');
    } catch (error) {
      console.warn('Failed to trigger selection haptic:', error);
    }
  }
}

export const haptics = new HapticFeedbackImpl();
