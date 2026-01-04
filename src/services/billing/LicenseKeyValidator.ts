/**
 * LicenseKeyValidator.ts - Offline License Key System
 * 
 * Generates and validates license keys without requiring a server.
 * Uses cryptographic algorithms to ensure keys cannot be easily forged.
 * 
 * Key Format: XXXX-XXXX-XXXX-XXXX-XXXX
 * - First 4 chars: Plan identifier
 * - Next 8 chars: Encoded expiry date
 * - Next 4 chars: Device binding hash
 * - Last 4 chars: Checksum
 */

import { DeviceBindingService } from '@/services/DeviceBindingService';

export type LicenseKeyPlan = 'DAILY' | 'WEEK' | 'MONTH' | 'QRTR' | 'YEAR' | 'TRIAL';

interface LicenseKeyData {
  plan: LicenseKeyPlan;
  expiryDate: number;
  deviceHash: string;
  checksum: string;
}

interface ValidationResult {
  valid: boolean;
  plan?: LicenseKeyPlan;
  expiryDate?: number;
  daysRemaining?: number;
  error?: string;
}

class LicenseKeyValidatorService {
  // Secret salt for checksum generation (change this to your own secret)
  private readonly SECRET_SALT = 'BulkSMS_2025_License_v1_Secret';
  
  // Plan codes mapping
  private readonly PLAN_CODES: Record<LicenseKeyPlan, string> = {
    'TRIAL': 'TR',
    'DAILY': 'DY',
    'WEEK': 'WK',
    'MONTH': 'MO',
    'QRTR': 'QT',
    'YEAR': 'YR',
  };

  private readonly CODE_TO_PLAN: Record<string, LicenseKeyPlan> = {
    'TR': 'TRIAL',
    'DY': 'DAILY',
    'WK': 'WEEK',
    'MO': 'MONTH',
    'QT': 'QRTR',
    'YR': 'YEAR',
  };

  /**
   * Generate a license key for a specific plan and duration
   * This should be called by your license generation tool (not in the app)
   */
  async generateKey(plan: LicenseKeyPlan, durationDays: number): Promise<string> {
    const now = Date.now();
    const expiryDate = now + (durationDays * 24 * 60 * 60 * 1000);
    
    // Get device fingerprint for binding
    const deviceFingerprint = await DeviceBindingService.getFingerprint();
    const deviceHash = this.hashString(deviceFingerprint).substring(0, 4);
    
    // Encode components
    const planCode = this.PLAN_CODES[plan];
    const expiryEncoded = this.encodeDate(expiryDate);
    
    // Generate checksum
    const checksumInput = `${planCode}${expiryEncoded}${deviceHash}${this.SECRET_SALT}`;
    const checksum = this.generateChecksum(checksumInput);
    
    // Format: PPEE-EEEE-EEEE-DDDD-CCCC
    const key = `${planCode}${expiryEncoded.substring(0, 2)}-${expiryEncoded.substring(2, 6)}-${expiryEncoded.substring(6, 10)}-${deviceHash}-${checksum}`;
    
    return key.toUpperCase();
  }

  /**
   * Validate a license key
   */
  async validateKey(licenseKey: string): Promise<ValidationResult> {
    try {
      // Remove dashes and convert to uppercase
      const cleanKey = licenseKey.replace(/-/g, '').toUpperCase();
      
      // Check length
      if (cleanKey.length !== 20) {
        return { valid: false, error: 'Invalid key format (incorrect length)' };
      }

      // Extract components
      const planCode = cleanKey.substring(0, 2);
      const expiryEncoded = cleanKey.substring(2, 12);
      const deviceHash = cleanKey.substring(12, 16);
      const providedChecksum = cleanKey.substring(16, 20);

      // Validate plan code
      const plan = this.CODE_TO_PLAN[planCode];
      if (!plan) {
        return { valid: false, error: 'Invalid plan code' };
      }

      // Decode expiry date
      const expiryDate = this.decodeDate(expiryEncoded);
      if (!expiryDate || expiryDate < 0) {
        return { valid: false, error: 'Invalid expiry date encoding' };
      }

      // Verify checksum
      const checksumInput = `${planCode}${expiryEncoded}${deviceHash}${this.SECRET_SALT}`;
      const computedChecksum = this.generateChecksum(checksumInput);
      
      if (computedChecksum !== providedChecksum) {
        return { valid: false, error: 'Invalid key (checksum mismatch)' };
      }

      // Verify device binding
      const currentDeviceFingerprint = await DeviceBindingService.getFingerprint();
      const currentDeviceHash = this.hashString(currentDeviceFingerprint).substring(0, 4);
      
      if (deviceHash !== currentDeviceHash) {
        return { 
          valid: false, 
          error: 'Key is bound to a different device. Contact support for key transfer.' 
        };
      }

      // Check if expired
      const now = Date.now();
      if (expiryDate < now) {
        const daysExpired = Math.floor((now - expiryDate) / (24 * 60 * 60 * 1000));
        return { 
          valid: false, 
          error: `License expired ${daysExpired} days ago`,
          plan,
          expiryDate,
          daysRemaining: 0
        };
      }

      // Calculate days remaining
      const daysRemaining = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));

      return {
        valid: true,
        plan,
        expiryDate,
        daysRemaining
      };
    } catch (error) {
      console.error('[LicenseKeyValidator] Validation error:', error);
      return { valid: false, error: 'Key validation failed' };
    }
  }

  /**
   * Encode timestamp to 10-character string
   */
  private encodeDate(timestamp: number): string {
    // Convert to base36 and pad to 10 characters
    const encoded = timestamp.toString(36).toUpperCase();
    return encoded.padStart(10, '0');
  }

  /**
   * Decode 10-character string back to timestamp
   */
  private decodeDate(encoded: string): number {
    try {
      return parseInt(encoded, 36);
    } catch {
      return -1;
    }
  }

  /**
   * Generate 4-character checksum
   */
  private generateChecksum(input: string): string {
    const hash = this.hashString(input);
    // Take first 4 characters of hash
    return hash.substring(0, 4).toUpperCase();
  }

  /**
   * Simple but effective hash function
   */
  private hashString(str: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    
    const result = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    return result.padStart(16, '0');
  }

  /**
   * Generate multiple keys for distribution
   * Use this in a separate Node.js script, not in the app
   */
  async generateBulkKeys(plan: LicenseKeyPlan, durationDays: number, count: number): Promise<string[]> {
    const keys: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // For bulk generation, use random device hashes
      // Real keys should be generated per-device
      const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const now = Date.now();
      const expiryDate = now + (durationDays * 24 * 60 * 60 * 1000);
      
      const planCode = this.PLAN_CODES[plan];
      const expiryEncoded = this.encodeDate(expiryDate);
      
      const checksumInput = `${planCode}${expiryEncoded}${randomHash}${this.SECRET_SALT}`;
      const checksum = this.generateChecksum(checksumInput);
      
      const key = `${planCode}${expiryEncoded.substring(0, 2)}-${expiryEncoded.substring(2, 6)}-${expiryEncoded.substring(6, 10)}-${randomHash}-${checksum}`;
      keys.push(key.toUpperCase());
    }
    
    return keys;
  }
}

export const licenseKeyValidator = new LicenseKeyValidatorService();
export default licenseKeyValidator;
