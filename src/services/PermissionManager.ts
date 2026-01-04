// ------------------------------------------------------
// 🔐 src/services/PermissionManager.ts
// ✅ Unified Permission Manager with Progressive Requests
// ------------------------------------------------------

import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types & Enums
// ============================================================================

export enum PermissionCategory {
    ESSENTIAL = 'essential',   // Required for core functionality
    OPTIONAL = 'optional',     // Enhances UX but not required
    STORAGE = 'storage',       // For file operations
}

export enum PermissionDenialStrategy {
    SHOW_RATIONALE = 'show_rationale',    // First denial - explain why
    PROMPT_SETTINGS = 'prompt_settings',   // Second denial - offer settings
    HIDE_FEATURE = 'hide_feature',         // Permanent denial - graceful degradation
}

export interface PermissionConfig {
    permission: string;
    category: PermissionCategory;
    rationale: string;
    impactIfDenied: string;
    requiredForFeature?: string;
}

export interface EssentialPermissionsResult {
    canSend: boolean;
    canRead: boolean;
    hasMinimum: boolean;  // At least SEND_SMS granted
    deniedPermissions: string[];
}

export interface OptionalPermissionsResult {
    hasContacts: boolean;
    hasReceive: boolean;
    deniedPermissions: string[];
}

export interface DetailedPermissionResult {
    READ_SMS: boolean;
    RECEIVE_SMS: boolean;
    SEND_SMS: boolean;
    READ_CONTACTS: boolean;
    allGranted: boolean;
    missingPermissions: string[];
    impactMessage: string;
}

// ============================================================================
// Permission Configurations
// ============================================================================

const PERMISSION_CONFIGS: Record<string, PermissionConfig> = {
    SEND_SMS: {
        permission: PermissionsAndroid.PERMISSIONS.SEND_SMS,
        category: PermissionCategory.ESSENTIAL,
        rationale: 'Send SMS permission is required to send text messages to your contacts. This is the core functionality of BulkSMS Pro.',
        impactIfDenied: '🚫 Cannot send messages - app will not function',
        requiredForFeature: 'Sending SMS messages',
    },
    READ_SMS: {
        permission: PermissionsAndroid.PERMISSIONS.READ_SMS,
        category: PermissionCategory.ESSENTIAL,
        rationale: 'Read SMS permission allows the app to read your message history and detect M-Pesa payment confirmations automatically.',
        impactIfDenied: '📭 Cannot read message history or detect M-Pesa payments',
        requiredForFeature: 'M-Pesa detection & message history',
    },
    RECEIVE_SMS: {
        permission: PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        category: PermissionCategory.OPTIONAL,
        rationale: 'Receive SMS permission enables real-time detection of incoming M-Pesa confirmations and automatic message synchronization.',
        impactIfDenied: '🔕 Real-time M-Pesa detection disabled - manual refresh required',
        requiredForFeature: 'Real-time message sync',
    },
    READ_CONTACTS: {
        permission: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        category: PermissionCategory.OPTIONAL,
        rationale: 'Contacts permission allows you to quickly select recipients from your phone\'s contact list for bulk messaging.',
        impactIfDenied: '👤 Contact picker unavailable - enter phone numbers manually',
        requiredForFeature: 'Contact picker',
    },
    WRITE_EXTERNAL_STORAGE: {
        permission: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        category: PermissionCategory.STORAGE,
        rationale: 'Storage permission is needed to export M-Pesa statements and SMS logs to Excel files on your device.',
        impactIfDenied: '💾 Cannot export files - data stays in app only',
        requiredForFeature: 'File exports',
    },
};

const DENIAL_COUNT_PREFIX = 'permission_denial_count_';

// ============================================================================
// PermissionManager Class (Singleton)
// ============================================================================

export class PermissionManager {
    private static instance: PermissionManager | null = null;

    private constructor() { }

    static getInstance(): PermissionManager {
        if (!PermissionManager.instance) {
            PermissionManager.instance = new PermissionManager();
        }
        return PermissionManager.instance;
    }

    // ==========================================================================
    // Essential Permissions (Progressive Flow - Step 1)
    // ==========================================================================

    /**
     * Request only essential permissions: SEND_SMS and READ_SMS
     * This is the first step in progressive permission flow
     */
    async requestEssentialPermissions(): Promise<EssentialPermissionsResult> {
        if (Platform.OS !== 'android') {
            return { canSend: true, canRead: true, hasMinimum: true, deniedPermissions: [] };
        }

        try {
            const results = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.SEND_SMS,
                PermissionsAndroid.PERMISSIONS.READ_SMS,
            ]);

            const canSend = results[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;
            const canRead = results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;

            const deniedPermissions: string[] = [];
            if (!canSend) {
                deniedPermissions.push('SEND_SMS');
                await this.incrementDenialCount('SEND_SMS');
            }
            if (!canRead) {
                deniedPermissions.push('READ_SMS');
                await this.incrementDenialCount('READ_SMS');
            }

            return {
                canSend,
                canRead,
                hasMinimum: canSend,  // At minimum, need SEND_SMS
                deniedPermissions,
            };
        } catch (err) {
            console.warn('[PermissionManager] Essential permissions request failed:', err);
            return { canSend: false, canRead: false, hasMinimum: false, deniedPermissions: ['SEND_SMS', 'READ_SMS'] };
        }
    }

    /**
     * Check essential permissions without prompting
     */
    async checkEssentialPermissions(): Promise<EssentialPermissionsResult> {
        if (Platform.OS !== 'android') {
            return { canSend: true, canRead: true, hasMinimum: true, deniedPermissions: [] };
        }

        try {
            const canSend = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
            const canRead = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);

            const deniedPermissions: string[] = [];
            if (!canSend) deniedPermissions.push('SEND_SMS');
            if (!canRead) deniedPermissions.push('READ_SMS');

            return { canSend, canRead, hasMinimum: canSend, deniedPermissions };
        } catch (err) {
            console.warn('[PermissionManager] Essential permissions check failed:', err);
            return { canSend: false, canRead: false, hasMinimum: false, deniedPermissions: ['SEND_SMS', 'READ_SMS'] };
        }
    }

    /**
     * Ensure essential permissions are granted (check then request if needed)
     */
    async ensureEssentialPermissions(): Promise<boolean> {
        const current = await this.checkEssentialPermissions();
        if (current.hasMinimum) return true;
        const result = await this.requestEssentialPermissions();
        return result.hasMinimum;
    }

    // ==========================================================================
    // Optional Permissions (Progressive Flow - Step 2)
    // ==========================================================================

    /**
     * Request optional permissions: READ_CONTACTS and RECEIVE_SMS
     * Should be called contextually when user needs these features
     */
    async requestOptionalPermissions(): Promise<OptionalPermissionsResult> {
        if (Platform.OS !== 'android') {
            return { hasContacts: true, hasReceive: true, deniedPermissions: [] };
        }

        try {
            const results = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            ]);

            const hasContacts = results[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED;
            const hasReceive = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;

            const deniedPermissions: string[] = [];
            if (!hasContacts) {
                deniedPermissions.push('READ_CONTACTS');
                await this.incrementDenialCount('READ_CONTACTS');
            }
            if (!hasReceive) {
                deniedPermissions.push('RECEIVE_SMS');
                await this.incrementDenialCount('RECEIVE_SMS');
            }

            return { hasContacts, hasReceive, deniedPermissions };
        } catch (err) {
            console.warn('[PermissionManager] Optional permissions request failed:', err);
            return { hasContacts: false, hasReceive: false, deniedPermissions: ['READ_CONTACTS', 'RECEIVE_SMS'] };
        }
    }

    // ==========================================================================
    // Single Permission with Rationale
    // ==========================================================================

    /**
   * Check if should show rationale for a permission
   */
    async shouldShowRationale(permission: string): Promise<boolean> {
        if (Platform.OS !== 'android' || Platform.Version < 23) {
            return false;
        }

        try {
            // Type cast needed as shouldShowRequestPermissionRationale may not be in type defs
            const rationale = (PermissionsAndroid as any).shouldShowRequestPermissionRationale;
            if (typeof rationale === 'function') {
                return await rationale(permission);
            }
            return false;
        } catch (err) {
            console.warn('[PermissionManager] Failed to check rationale:', err);
            return false;
        }
    }

    /**
     * Request a single permission with rationale handling
     */
    async requestWithRationale(
        permissionKey: keyof typeof PERMISSION_CONFIGS,
        onRationaleNeeded?: (rationale: string) => Promise<boolean>
    ): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        const config = PERMISSION_CONFIGS[permissionKey];
        if (!config) {
            console.warn('[PermissionManager] Unknown permission:', permissionKey);
            return false;
        }

        try {
            const shouldShow = await this.shouldShowRationale(config.permission);

            if (shouldShow && onRationaleNeeded) {
                // Callback to show custom rationale UI
                const userAccepted = await onRationaleNeeded(config.rationale);
                if (!userAccepted) {
                    await this.incrementDenialCount(permissionKey);
                    return false;
                }
            }

            const result = await PermissionsAndroid.request(config.permission as any);
            const granted = result === PermissionsAndroid.RESULTS.GRANTED;

            if (!granted) {
                await this.incrementDenialCount(permissionKey);
            }

            return granted;
        } catch (err) {
            console.warn('[PermissionManager] Request with rationale failed:', err);
            return false;
        }
    }

    /**
     * Check a single permission
     */
    async checkPermission(permission: string): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        if (!permission) {
            console.warn('[PermissionManager] Null permission parameter detected');
            return false;
        }

        try {
            return await PermissionsAndroid.check(permission as any);
        } catch (err) {
            console.warn('[PermissionManager] Check permission failed:', err);
            return false;
        }
    }

    // ==========================================================================
    // Denial Handling
    // ==========================================================================

    /**
     * Get denial strategy based on denial count and rationale status
     */
    async getDenialStrategy(permissionKey: string): Promise<PermissionDenialStrategy> {
        const config = PERMISSION_CONFIGS[permissionKey];
        if (!config) {
            return PermissionDenialStrategy.HIDE_FEATURE;
        }

        const denialCount = await this.getDenialCount(permissionKey);
        const shouldShow = await this.shouldShowRationale(config.permission);

        if (shouldShow) {
            return PermissionDenialStrategy.SHOW_RATIONALE;
        }

        // If can't show rationale and denied 2+ times, assume "Don't ask again"
        if (denialCount >= 2) {
            return PermissionDenialStrategy.PROMPT_SETTINGS;
        }

        return PermissionDenialStrategy.HIDE_FEATURE;
    }

    private async getDenialCount(permissionKey: string): Promise<number> {
        try {
            const key = `${DENIAL_COUNT_PREFIX}${permissionKey}`;
            const count = await AsyncStorage.getItem(key);
            return count ? parseInt(count, 10) : 0;
        } catch (err) {
            return 0;
        }
    }

    private async incrementDenialCount(permissionKey: string): Promise<void> {
        try {
            const key = `${DENIAL_COUNT_PREFIX}${permissionKey}`;
            const current = await this.getDenialCount(permissionKey);
            await AsyncStorage.setItem(key, String(current + 1));
        } catch (err) {
            console.warn('[PermissionManager] Failed to increment denial count:', err);
        }
    }

    async resetDenialCount(permissionKey: string): Promise<void> {
        try {
            const key = `${DENIAL_COUNT_PREFIX}${permissionKey}`;
            await AsyncStorage.removeItem(key);
        } catch (err) {
            console.warn('[PermissionManager] Failed to reset denial count:', err);
        }
    }

    // ==========================================================================
    // Settings Navigation
    // ==========================================================================

    /**
     * Open app settings (with optional Android deep link attempt)
     */
    async openSettings(): Promise<void> {
        try {
            if (Platform.OS === 'android') {
                // Try to open app-specific settings
                await Linking.openSettings();
            } else {
                await Linking.openSettings();
            }
        } catch (err) {
            console.warn('[PermissionManager] Failed to open settings:', err);
            Alert.alert(
                'Cannot Open Settings',
                'Please open Settings manually and grant permissions to BulkSMS Pro.'
            );
        }
    }

    /**
     * Show alert with "Go to Settings" option
     */
    async promptSettings(permissionKey: string): Promise<boolean> {
        const config = PERMISSION_CONFIGS[permissionKey];
        if (!config) return false;

        return new Promise((resolve) => {
            Alert.alert(
                'Permission Required',
                `${config.requiredForFeature} requires ${permissionKey} permission.\n\n${config.rationale}\n\nPlease enable it in Settings.`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => resolve(false),
                    },
                    {
                        text: 'Open Settings',
                        onPress: async () => {
                            await this.openSettings();
                            resolve(true);
                        },
                    },
                ]
            );
        });
    }

    // ==========================================================================
    // Backward Compatibility (Detailed Results)
    // ==========================================================================

    /**
     * Get detailed permission status (backward compatible with requestPermissions.ts)
     */
    async checkAllPermissionsDetailed(): Promise<DetailedPermissionResult> {
        if (Platform.OS !== 'android') {
            return {
                READ_SMS: true,
                RECEIVE_SMS: true,
                SEND_SMS: true,
                READ_CONTACTS: true,
                allGranted: true,
                missingPermissions: [],
                impactMessage: '',
            };
        }

        try {
            const READ_SMS = await this.checkPermission(PermissionsAndroid.PERMISSIONS.READ_SMS);
            const RECEIVE_SMS = await this.checkPermission(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
            const SEND_SMS = await this.checkPermission(PermissionsAndroid.PERMISSIONS.SEND_SMS);
            const READ_CONTACTS = await this.checkPermission(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);

            const allGranted = READ_SMS && RECEIVE_SMS && SEND_SMS && READ_CONTACTS;

            const missingPermissions: string[] = [];
            if (!READ_SMS) missingPermissions.push('READ_SMS');
            if (!RECEIVE_SMS) missingPermissions.push('RECEIVE_SMS');
            if (!SEND_SMS) missingPermissions.push('SEND_SMS');
            if (!READ_CONTACTS) missingPermissions.push('READ_CONTACTS');

            const impactMessage = this.getPermissionImpactMessage(missingPermissions);

            return {
                READ_SMS,
                RECEIVE_SMS,
                SEND_SMS,
                READ_CONTACTS,
                allGranted,
                missingPermissions,
                impactMessage,
            };
        } catch (err) {
            console.warn('[PermissionManager] Check all permissions failed:', err);
            return {
                READ_SMS: false,
                RECEIVE_SMS: false,
                SEND_SMS: false,
                READ_CONTACTS: false,
                allGranted: false,
                missingPermissions: ['READ_SMS', 'RECEIVE_SMS', 'SEND_SMS', 'READ_CONTACTS'],
                impactMessage: 'Cannot check permissions. Please restart the app.',
            };
        }
    }

    /**
     * Request all permissions at once (backward compatible - not recommended for new code)
     */
    async requestAllPermissions(): Promise<DetailedPermissionResult> {
        if (Platform.OS !== 'android') {
            return {
                READ_SMS: true,
                RECEIVE_SMS: true,
                SEND_SMS: true,
                READ_CONTACTS: true,
                allGranted: true,
                missingPermissions: [],
                impactMessage: '',
            };
        }

        try {
            const results = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_SMS,
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                PermissionsAndroid.PERMISSIONS.SEND_SMS,
                PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
            ]);

            const READ_SMS = results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
            const RECEIVE_SMS = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
            const SEND_SMS = results[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;
            const READ_CONTACTS = results[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED;

            const allGranted = READ_SMS && RECEIVE_SMS && SEND_SMS && READ_CONTACTS;

            const missingPermissions: string[] = [];
            if (!READ_SMS) {
                missingPermissions.push('READ_SMS');
                await this.incrementDenialCount('READ_SMS');
            }
            if (!RECEIVE_SMS) {
                missingPermissions.push('RECEIVE_SMS');
                await this.incrementDenialCount('RECEIVE_SMS');
            }
            if (!SEND_SMS) {
                missingPermissions.push('SEND_SMS');
                await this.incrementDenialCount('SEND_SMS');
            }
            if (!READ_CONTACTS) {
                missingPermissions.push('READ_CONTACTS');
                await this.incrementDenialCount('READ_CONTACTS');
            }

            const impactMessage = this.getPermissionImpactMessage(missingPermissions);

            return {
                READ_SMS,
                RECEIVE_SMS,
                SEND_SMS,
                READ_CONTACTS,
                allGranted,
                missingPermissions,
                impactMessage,
            };
        } catch (err) {
            console.warn('[PermissionManager] Request all permissions failed:', err);
            return {
                READ_SMS: false,
                RECEIVE_SMS: false,
                SEND_SMS: false,
                READ_CONTACTS: false,
                allGranted: false,
                missingPermissions: ['READ_SMS', 'RECEIVE_SMS', 'SEND_SMS', 'READ_CONTACTS'],
                impactMessage: 'All features disabled. Please grant permissions to use BulkSMS.',
            };
        }
    }

    private getPermissionImpactMessage(missingPermissions: string[]): string {
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

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    /**
     * Get permission configuration
     */
    getPermissionConfig(permissionKey: string): PermissionConfig | undefined {
        return PERMISSION_CONFIGS[permissionKey];
    }

    /**
     * Get all permission configurations
     */
    getAllPermissionConfigs(): Record<string, PermissionConfig> {
        return PERMISSION_CONFIGS;
    }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/** Get singleton instance */
export const permissionManager = PermissionManager.getInstance();

/** Export permission configs for UI components */
export { PERMISSION_CONFIGS };
