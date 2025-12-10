import { Platform, PermissionsAndroid } from 'react-native';
import { smsSender } from '../native'; // Importing from the Central Bridge

// Error codes for UI handling
export enum SmsError {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MISSING_PHONE_PERMISSION = 'MISSING_PHONE_PERMISSION',
  INVALID_INPUT = 'INVALID_INPUT',
  NATIVE_FAILURE = 'NATIVE_FAILURE',
}

interface SendResult {
  success: boolean;
  error?: SmsError;
  details?: string;
}

/**
 * Get SIM Count using the Central Bridge
 * Safely handles non-Android platforms and native errors.
 */
export const getSimCount = async (): Promise<number> => {
  if (Platform.OS !== 'android') {
    return 0;
  }
  try {
    return await smsSender.getSimCount();
  } catch (e) {
    console.warn("[SmsService] Failed to get SIM count", e);
    // Default safely to 1 so the app doesn't break if native bridge fails
    return 1;
  }
};

/**
 * High-Level SMS Send with Permission Handling
 */
export const sendSingleSms = async (
  phoneNumber: string,
  message: string,
  simSlot: number = 0
): Promise<SendResult> => {

  if (Platform.OS !== 'android') {
    return { success: false, error: SmsError.NATIVE_FAILURE, details: 'Android only' };
  }

  if (!phoneNumber || !message) {
    return { success: false, error: SmsError.INVALID_INPUT };
  }

  try {
    // 1. Permission Logic (Check BEFORE Requesting for better UX)
    const hasSmsPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
    if (!hasSmsPerm) {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return { success: false, error: SmsError.PERMISSION_DENIED };
      }
    }

    // Dual SIM requires Phone State permission to select subscription
    if (simSlot > 0) {
      const hasPhonePerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
      if (!hasPhonePerm) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return { success: false, error: SmsError.MISSING_PHONE_PERMISSION };
        }
      }
    }

    // 2. Execution (Native Layer via Bridge)
    const success: boolean = await smsSender.send(phoneNumber, message, simSlot);

    if (success === true) {
      return { success: true };
    } else {
      return {
        success: false,
        error: SmsError.NATIVE_FAILURE,
        details: "Native send returned false"
      };
    }

  } catch (error: any) {
    console.error('[SmsService] Send Failed:', error);
    return {
      success: false,
      error: SmsError.NATIVE_FAILURE,
      details: error?.message || 'Unknown Error'
    };
  }
}


/**
 * Check if the device is capable of sending SMS
 */
export const canSendSms = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    return await smsSender.canSend();
  } catch (e) {
    console.warn("[SmsService] Failed to check capability", e);
    return false;
  }
};