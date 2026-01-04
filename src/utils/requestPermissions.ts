// ------------------------------------------------------
// 📱 src/utils/requestPermissions.ts
// ✅ Unified SMS + Contacts Permission Service
// ------------------------------------------------------

import { PermissionsAndroid, Platform, Linking } from 'react-native';

export type PermissionResult = {
  smsGranted: boolean;
  receiveSmsGranted: boolean;
  contactsGranted: boolean;
  overlayGranted: boolean;
  allGranted: boolean;
};

export type DetailedPermissionResult = {
  READ_SMS: boolean;
  RECEIVE_SMS: boolean;
  SEND_SMS: boolean;
  READ_CONTACTS: boolean;
  SYSTEM_ALERT_WINDOW?: boolean;
  overlayGranted?: boolean; // For legacy support
  allGranted: boolean;
  missingPermissions: string[];
  impactMessage: string;
};

/**
 * ✅ UNIFIED: Request all SMS + Contact permissions simultaneously
 * Returns detailed status with user-friendly impact messaging
 */
export async function requestSmsAndContactPermissionsDetailed(): Promise<DetailedPermissionResult> {
  if (Platform.OS !== 'android') {
    return {
      READ_SMS: true,
      RECEIVE_SMS: true,
      SEND_SMS: true,
      READ_CONTACTS: true,
      SYSTEM_ALERT_WINDOW: true,
      overlayGranted: true,
      allGranted: true,
      missingPermissions: [],
      impactMessage: '',
    };
  }

  try {
    // 🚀 Request all permissions at once for better UX
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    // Check overlay permission separately (needs special handling)
    let overlayGranted = false;
    try {
      if (PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW) {
        overlayGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW);
      }
      if (!overlayGranted) {
        // Request overlay permission
        if (PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW) {
          const overlayResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW);
          overlayGranted = overlayResult === PermissionsAndroid.RESULTS.GRANTED;
        }
      }
    } catch (e) {
      console.warn('[Permissions] Overlay permission check failed:', e);
    }

    const READ_SMS = results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    const RECEIVE_SMS = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    const SEND_SMS = results[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    const READ_CONTACTS = results[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED;

    const allGranted = READ_SMS && RECEIVE_SMS && SEND_SMS && READ_CONTACTS && overlayGranted;

    const missingPermissions: string[] = [];
    if (!READ_SMS) missingPermissions.push('READ_SMS');
    if (!RECEIVE_SMS) missingPermissions.push('RECEIVE_SMS');
    if (!SEND_SMS) missingPermissions.push('SEND_SMS');
    if (!READ_CONTACTS) missingPermissions.push('READ_CONTACTS');
    if (!overlayGranted) missingPermissions.push('SYSTEM_ALERT_WINDOW');

    let impactMessage = '';
    if (missingPermissions.length > 0) {
      const impacts: string[] = [];
      if (!READ_SMS) impacts.push('Cannot load existing messages');
      if (!RECEIVE_SMS) impacts.push('Cannot receive new SMS messages');
      if (!SEND_SMS) impacts.push('Cannot send SMS messages');
      if (!READ_CONTACTS) impacts.push('Cannot access contact names');
      if (!overlayGranted) impacts.push('Cannot show notifications over other apps');

      impactMessage = `Missing permissions impact: ${impacts.join(', ')}`;
    }

    return {
      READ_SMS,
      RECEIVE_SMS,
      SEND_SMS,
      READ_CONTACTS,
      SYSTEM_ALERT_WINDOW: overlayGranted,
      overlayGranted,
      allGranted,
      missingPermissions,
      impactMessage,
    };
  } catch (err) {
    console.warn('[Permissions] Request failed:', err);
    return {
      READ_SMS: false,
      RECEIVE_SMS: false,
      SEND_SMS: false,
      READ_CONTACTS: false,
      allGranted: false,
      missingPermissions: ['READ_SMS', 'RECEIVE_SMS', 'SEND_SMS', 'READ_CONTACTS'],
      SYSTEM_ALERT_WINDOW: false,
      overlayGranted: false,
      impactMessage: 'All features disabled. Please grant permissions to use BulkSMS.',
    };
  }
}

/**
 * 🔍 Check current permission status without prompting
 */
export async function checkSmsAndContactPermissionsDetailed(): Promise<DetailedPermissionResult> {
  if (Platform.OS !== 'android') {
    return {
      READ_SMS: true,
      RECEIVE_SMS: true,
      SEND_SMS: true,
      READ_CONTACTS: true,
      SYSTEM_ALERT_WINDOW: true,
      overlayGranted: true,
      allGranted: true,
      missingPermissions: [],
      impactMessage: '',
    };
  }

  try {
    const READ_SMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const RECEIVE_SMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    const SEND_SMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
    const READ_CONTACTS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);

    // Check overlay separately for completeness if needed, but for now defaulting to false or checking
    let overlayGranted = false;
    try {
      if (PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW) {
        overlayGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW);
      }
    } catch (e) { }

    const allGranted = READ_SMS && RECEIVE_SMS && SEND_SMS && READ_CONTACTS && overlayGranted;

    const missingPermissions: string[] = [];
    if (!READ_SMS) missingPermissions.push('READ_SMS');
    if (!RECEIVE_SMS) missingPermissions.push('RECEIVE_SMS');
    if (!SEND_SMS) missingPermissions.push('SEND_SMS');
    if (!READ_CONTACTS) missingPermissions.push('READ_CONTACTS');
    if (!overlayGranted) missingPermissions.push('SYSTEM_ALERT_WINDOW');

    const impactMessage = getPermissionImpactMessage(missingPermissions);

    return {
      READ_SMS,
      RECEIVE_SMS,
      SEND_SMS,
      READ_CONTACTS,
      SYSTEM_ALERT_WINDOW: overlayGranted, // This matches optional property
      overlayGranted,
      allGranted,
      missingPermissions,
      impactMessage,
    };
  } catch (err) {
    console.warn('[Permissions] Check failed:', err);
    return {
      READ_SMS: false,
      RECEIVE_SMS: false,
      SEND_SMS: false,
      READ_CONTACTS: false,
      allGranted: false,
      missingPermissions: ['READ_SMS', 'RECEIVE_SMS', 'SEND_SMS', 'READ_CONTACTS'],
      SYSTEM_ALERT_WINDOW: false,
      overlayGranted: false,
      impactMessage: 'Cannot check permissions. Please restart the app.',
    };
  }
}

/**
 * 💬 Generate user-friendly impact message based on missing permissions
 */
export function getPermissionImpactMessage(missingPermissions: string[]): string {
  if (missingPermissions.length === 0) return '';

  const impacts: string[] = [];

  if (missingPermissions.includes('READ_SMS')) {
    impacts.push('📭 Cannot read message history');
  }
  if (missingPermissions.includes('RECEIVE_SMS')) {
    impacts.push('🔕 Real-time message detection disabled');
  }
  if (missingPermissions.includes('SEND_SMS')) {
    impacts.push('🚫 Cannot send messages');
  }
  if (missingPermissions.includes('READ_CONTACTS')) {
    impacts.push('👤 Contact picker unavailable');
  }

  return impacts.join('\n');
}

/**
 * 🔧 Open app settings to allow user to grant permissions manually
 */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (err) {
    console.warn('[Permissions] Failed to open settings:', err);
  }
}

// ==========================================
// 🔄 BACKWARD COMPATIBILITY
// ==========================================

/**
 * @deprecated Use requestSmsAndContactPermissionsDetailed() for detailed status
 */
export async function requestSmsAndContactPermissions(): Promise<boolean> {
  const result = await requestSmsAndContactPermissionsDetailed();
  return result.allGranted;
}

/**
 * @deprecated Use checkSmsAndContactPermissionsDetailed() for detailed status
 */
export async function getSmsAndContactPermissions(): Promise<PermissionResult> {
  const result = await checkSmsAndContactPermissionsDetailed();
  return {
    smsGranted: result.SEND_SMS && result.READ_SMS,
    receiveSmsGranted: result.RECEIVE_SMS,
    contactsGranted: result.READ_CONTACTS,
    overlayGranted: !!result.SYSTEM_ALERT_WINDOW,
    allGranted: result.allGranted,
  };
}

/**
 * @deprecated Use requestSmsAndContactPermissionsDetailed() for detailed status
 */
export async function ensureSmsAndContactPermissions(): Promise<boolean> {
  const current = await checkSmsAndContactPermissionsDetailed();
  if (current.allGranted) return true;
  const result = await requestSmsAndContactPermissionsDetailed();
  return result.allGranted;
}
