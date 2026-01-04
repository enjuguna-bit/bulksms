import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

// ============================================================================
// 🎨 Avatar Colors (Consistent Hash)
// ============================================================================
const AVATAR_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#10b981', // emerald-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#0ea5e9', // sky-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#a855f7', // purple-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
    '#f43f5e', // rose-500
];

export function getAvatarColor(identifier: string): string {
    if (!identifier) return '#9ca3af'; // gray-400
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
        hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

export function getInitials(name: string): string {
    if (!name) return '#';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================================
// 📞 Contact Resolution
// ============================================================================

// Cache for resolved names: phoneNumber -> name
const contactCache = new Map<string, string>();

export async function ensureContactPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
            {
                title: 'Contacts Access',
                message: 'BulkSMS needs access to your contacts to show names.',
                buttonPositive: 'Allow',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS permission handled by library usually
}

export async function prefetchContacts(): Promise<void> {
    const hasPermission = await ensureContactPermission();
    if (!hasPermission) return;

    try {
        const contacts = await Contacts.getAll();
        contacts.forEach(contact => {
            const name = [contact.givenName, contact.familyName].filter(Boolean).join(' ');
            if (name) {
                contact.phoneNumbers.forEach(p => {
                    // Normalize phone number (simple strip)
                    const cleanPhone = p.number.replace(/\D/g, '');
                    if (cleanPhone.length >= 9) { // minimal valid length
                        // Store both full and partial matches could be complex, 
                        // for now just store the exact number from contact
                        contactCache.set(p.number.replace(/\s/g, ''), name);
                        // Also store local format?
                        // Ideally we normalize everything to E.164 but for now we keep it simple
                    }
                });
            }
        });
    } catch (e) {
        console.warn('Failed to prefetch contacts:', e);
    }
}

export function getContactName(phoneNumber: string): string | null {
    if (!phoneNumber) return null;
    // Try exact match
    if (contactCache.has(phoneNumber)) return contactCache.get(phoneNumber) || null;

    // Try without spaces
    const clean = phoneNumber.replace(/\s/g, '');
    if (contactCache.has(clean)) return contactCache.get(clean) || null;

    return null;
}

// ============================================================================
// 🕒 WhatsApp Time Format
// ============================================================================
export function formatWhatsAppTime(timestamp: number): string {
    const now = new Date();
    const date = new Date(timestamp);

    const isToday = now.toDateString() === date.toDateString();

    // Check yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (isYesterday) {
        return 'Yesterday';
    }

    // Check if same week (within last 7 days)
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' }); // Mon, Tue...
    }

    // Otherwise date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }); // Dec 20, 24
}
