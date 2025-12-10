// ------------------------------------------------------
// 📱 src/utils/requestPermissions.ts
// ✅ Runtime permissions for SMS + Contacts (React Native CLI)
// ------------------------------------------------------

import { PermissionsAndroid, Platform } from 'react-native';

export type PermissionResult = {
  smsGranted: boolean;
  contactsGranted: boolean;
  allGranted: boolean;
};

/**
 * ✅ Requests runtime permissions for SMS and Contacts.
 * Required for messaging features and contact selection.
 * Works only on Android; iOS returns `true` automatically.
 */
export async function requestSmsAndContactPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const smsGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SMS Permission',
        message: 'BulkSMS requires access to send and receive messages.',
        buttonPositive: 'Allow',
      }
    );

    const readSmsGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'Read SMS Permission',
        message: 'BulkSMS requires access to read messages for parsing and sync.',
        buttonPositive: 'Allow',
      }
    );

    const contactsGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts Permission',
        message: 'BulkSMS requires access to your contacts for message delivery.',
        buttonPositive: 'Allow',
      }
    );

    const allGranted =
      smsGranted === PermissionsAndroid.RESULTS.GRANTED &&
      readSmsGranted === PermissionsAndroid.RESULTS.GRANTED &&
      contactsGranted === PermissionsAndroid.RESULTS.GRANTED;

    if (!allGranted) {
      console.warn('[Permissions] Missing permissions', {
        smsGranted,
        readSmsGranted,
        contactsGranted,
      });
    }

    return allGranted;
  } catch (err) {
    console.warn('[Permissions] Request failed:', err);
    return false;
  }
}

/**
 * 🧪 Returns structured permission status for debugging or analytics.
 * Useful for onboarding checks, dashboards, or alerts.
 */
export async function getSmsAndContactPermissions(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    return { smsGranted: true, contactsGranted: true, allGranted: true };
  }

  try {
    const smsGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.SEND_SMS
    );
    const readSmsGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    const contactsGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS
    );

    const allGranted = smsGranted && readSmsGranted && contactsGranted;

    return { smsGranted: smsGranted && readSmsGranted, contactsGranted, allGranted };
  } catch (err) {
    console.warn('[Permissions] Check failed:', err);
    return { smsGranted: false, contactsGranted: false, allGranted: false };
  }
}

/**
 * 🚀 Optional helper — call this on app startup or onboarding.
 * It checks first, then requests only if needed.
 */
export async function ensureSmsAndContactPermissions(): Promise<boolean> {
  const current = await getSmsAndContactPermissions();
  if (current.allGranted) return true;
  return await requestSmsAndContactPermissions();
}
