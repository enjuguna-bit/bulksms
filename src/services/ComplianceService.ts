
import { addToBlacklist, isBlacklisted } from '@/db/opt-out/repository';
import Logger from '@/utils/logger';

const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'REMOVE', 'CANCEL', 'END', 'QUIT'];

export class ComplianceService {
    /**
     * Check incoming message for opt-out keywords
     */
    static async processIncomingMessage(phoneNumber: string, body: string): Promise<boolean> {
        if (!body) return false;

        const normalizedBody = body.trim().toUpperCase();

        // Strict match or starts with keyword (to handle "STOP PLEASE")
        const match = OPT_OUT_KEYWORDS.some(k => normalizedBody === k || normalizedBody.startsWith(k + ' '));

        if (match) {
            Logger.info('Compliance', `Opt-out keyword detected from ${phoneNumber}`);
            await addToBlacklist(phoneNumber, 'automated_keyword');
            return true;
        }

        return false;
    }

    /**
     * Filter recipients list against blacklist
     */
    static async filterRecipients(recipients: string[]): Promise<{ allowed: string[]; blocked: string[] }> {
        const allowed: string[] = [];
        const blocked: string[] = [];

        // Process in parallel chunks if needed, but for now simple loop is fine
        // For large lists, we might want to do a bulk query "WHERE phone IN (...)" 
        // but our repo only supports single check. Optimization for later.

        for (const recipient of recipients) {
            const isBlocked = await isBlacklisted(recipient);
            if (isBlocked) {
                blocked.push(recipient);
            } else {
                allowed.push(recipient);
            }
        }

        return { allowed, blocked };
    }
}
