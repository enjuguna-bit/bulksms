// ------------------------------------------------------
// 🔄 src/services/permissions-compat.ts
// Backward Compatibility Layer for Old Permission System
// ------------------------------------------------------

/**
 * This file provides backward compatible exports for existing code
 * that still imports from the old permission files.
 * 
 * Gradually migrate imports to use PermissionManager directly:
 * - OLD: import { requestSmsPermissions } from '@/services/permissions'
 * - NEW: import { PermissionManager } from '@/services/PermissionManager'
 */

import { PermissionManager } from './PermissionManager';

const manager = PermissionManager.getInstance();

// =================================================================
// Backward Compatible Exports from permissions.ts
// =================================================================

/**
 * @deprecated Use PermissionManager.getInstance().requestEssentialPermissions()
 */
export async function requestSmsPermissions(): Promise<boolean> {
    const result = await manager.requestEssentialPermissions();
    return result.hasMinimum;
}

/**
 * @deprecated Use PermissionManager.getInstance().checkEssentialPermissions()
 */
export async function checkSmsPermissions(): Promise<boolean> {
    const result = await manager.checkEssentialPermissions();
    return result.hasMinimum && result.canRead;
}

/**
 * @deprecated Use PermissionManager.getInstance().ensureEssentialPermissions()
 */
export async function ensureSmsPermissions(): Promise<boolean> {
    return await manager.ensureEssentialPermissions();
}

/**
 * @deprecated Use PermissionManager.getInstance().ensureEssentialPermissions()
 */
export async function checkAndRequestPermissions(): Promise<boolean> {
    return await manager.ensureEssentialPermissions();
}

/**
 * @deprecated Use PermissionManager.getInstance().checkAllPermissionsDetailed()
 */
export async function hasPartialSmsPermission(): Promise<boolean> {
    const result = await manager.checkAllPermissionsDetailed();
    return result.SEND_SMS || result.READ_SMS || result.RECEIVE_SMS;
}

// =================================================================
// Backward Compatible Exports from requestPermissions.ts
// =================================================================

/**
 * @deprecated Use PermissionManager.getInstance().requestAllPermissions()
 */
export async function requestSmsAndContactPermissionsDetailed() {
    return await manager.requestAllPermissions();
}

/**
 * @deprecated Use PermissionManager.getInstance().checkAllPermissionsDetailed()
 */
export async function checkSmsAndContactPermissionsDetailed() {
    return await manager.checkAllPermissionsDetailed();
}

/**
 * @deprecated Use PermissionManager.getInstance().requestAllPermissions()
 */
export async function requestSmsAndContactPermissions(): Promise<boolean> {
    const result = await manager.requestAllPermissions();
    return result.allGranted;
}

/**
 * @deprecated Use PermissionManager.getInstance().checkAllPermissionsDetailed()
 */
export async function getSmsAndContactPermissions() {
    const result = await manager.checkAllPermissionsDetailed();
    return {
        smsGranted: result.SEND_SMS && result.READ_SMS,
        receiveSmsGranted: result.RECEIVE_SMS,
        contactsGranted: result.READ_CONTACTS,
        allGranted: result.allGranted,
    };
}

/**
 * @deprecated Use PermissionManager.getInstance().ensureEssentialPermissions()
 */
export async function ensureSmsAndContactPermissions(): Promise<boolean> {
    const current = await manager.checkAllPermissionsDetailed();
    if (current.allGranted) return true;
    const result = await manager.requestAllPermissions();
    return result.allGranted;
}

/**
 * @deprecated Use PermissionManager.getInstance().getPermissionImpactMessage()
 */
export function getPermissionImpactMessage(missingPermissions: string[]): string {
    return manager['getPermissionImpactMessage'](missingPermissions);
}

/**
 * @deprecated Use PermissionManager.getInstance().openSettings()
 */
export async function openAppSettings(): Promise<void> {
    await manager.openSettings();
}
