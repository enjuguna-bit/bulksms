/**
 * parseMpesaEnhanced.test.ts
 * Edge-case tests for M-PESA message parser
 */

import {
    parseMpesaMessage,
    isMpesaMessage,
    parseMpesaMessages,
    getMpesaSummary,
    type MpesaTransactionType,
} from '../parseMpesaEnhanced';

// ---------------------------------------------------------------------
// Test Data: Real M-PESA Message Formats
// ---------------------------------------------------------------------

const SAMPLE_MESSAGES = {
    RECEIVED: 'THQ5ZPB2TN Confirmed. Ksh1,500.00 received from JOHN DOE 0712345678 on 22/12/24 at 10:30 AM. New M-PESA balance is Ksh5,000.00.',
    SENT: 'URK8LPQ9MN Confirmed. Ksh500.00 sent to JANE MWANGI 0798765432 on 21/12/24 at 2:15 PM. New M-PESA balance is Ksh4,500.00.',
    PAYBILL: 'PQR3XYZ1AB Confirmed. Ksh2,000.00 paid to KENYA POWER. for account 12345678 on 20/12/24 at 9:00 AM. New M-PESA balance is Ksh2,500.00.',
    BUYGOODS: 'ABC7DEF8GH Confirmed. Ksh1,000.00 paid to NAIVAS SUPERMARKET. Till Number 123456 on 19/12/24 at 4:30 PM. New M-PESA balance is Ksh3,500.00.',
    DEPOSIT: 'MNO2PQR3ST Confirmed. Ksh5,000.00 deposited at JANE AGENT SHOP on 18/12/24 at 11:00 AM. New M-PESA balance is Ksh8,000.00.',
    WITHDRAW: 'XYZ1ABC2DE Confirmed. Ksh2,000.00 withdrawn from PETER AGENT on 17/12/24 at 3:45 PM. New M-PESA balance is Ksh6,000.00.',
    AIRTIME: 'JKL4MNO5PQ Confirmed. You bought Ksh100.00 of airtime on 16/12/24 at 8:00 AM. New M-PESA balance is Ksh5,900.00.',
    FULIZA: 'RST6UVW7XY Confirmed. Fuliza M-PESA Ksh500.00 loan on 15/12/24 at 6:00 PM. M-PESA balance is Ksh0.00.',
};

// ---------------------------------------------------------------------
// isMpesaMessage tests
// ---------------------------------------------------------------------

describe('isMpesaMessage', () => {
    it('should return true for valid M-PESA messages', () => {
        Object.values(SAMPLE_MESSAGES).forEach(msg => {
            expect(isMpesaMessage(msg)).toBe(true);
        });
    });

    it('should return false for non-M-PESA messages', () => {
        const nonMpesa = [
            'Hello, how are you?',
            'Your OTP is 123456',
            'Reminder: Meeting at 3pm',
            '',
            null as any,
            undefined as any,
        ];
        nonMpesa.forEach(msg => {
            expect(isMpesaMessage(msg)).toBe(false);
        });
    });

    it('should return false for message without transaction code', () => {
        const noCode = 'Confirmed. Ksh1,500.00 received from JOHN DOE';
        expect(isMpesaMessage(noCode)).toBe(false);
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - RECEIVED type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - RECEIVED', () => {
    it('should parse standard received message', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.RECEIVED);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('RECEIVED');
        expect(result!.reference).toBe('THQ5ZPB2TN');
        expect(result!.amount).toBe(1500);
        expect(result!.name).toBe('John Doe');
        expect(result!.phone).toContain('712345678');
        expect(result!.balance).toBe(5000);
    });

    it('should handle received without phone number', () => {
        const msg = 'ABC123DEFG Confirmed. Ksh2,000.00 received from PETER KAMAU on 25/12/24 at 9:00 AM. New M-PESA balance is Ksh10,000.00.';
        const result = parseMpesaMessage(msg);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('RECEIVED');
        expect(result!.name).toContain('Peter');
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - SENT type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - SENT', () => {
    it('should parse standard sent message', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.SENT);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('SENT');
        expect(result!.reference).toBe('URK8LPQ9MN');
        expect(result!.amount).toBe(500);
        expect(result!.name).toBe('Jane Mwangi');
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - PAYBILL type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - PAYBILL', () => {
    it('should parse paybill with account', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.PAYBILL);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('PAYBILL');
        expect(result!.amount).toBe(2000);
        expect(result!.account).toBe('12345678');
        expect(result!.name).toContain('Kenya Power');
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - BUYGOODS type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - BUYGOODS', () => {
    it('should parse buy goods with till number', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.BUYGOODS);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('BUYGOODS');
        expect(result!.amount).toBe(1000);
        expect(result!.till).toBe('123456');
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - DEPOSIT type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - DEPOSIT', () => {
    it('should parse deposit message', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.DEPOSIT);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('DEPOSIT');
        expect(result!.amount).toBe(5000);
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - WITHDRAW type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - WITHDRAW', () => {
    it('should parse withdraw message', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.WITHDRAW);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('WITHDRAW');
        expect(result!.amount).toBe(2000);
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - AIRTIME type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - AIRTIME', () => {
    it('should parse airtime purchase', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.AIRTIME);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('AIRTIME');
        expect(result!.amount).toBe(100);
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessage - FULIZA type
// ---------------------------------------------------------------------

describe('parseMpesaMessage - FULIZA', () => {
    it('should parse Fuliza loan message', () => {
        const result = parseMpesaMessage(SAMPLE_MESSAGES.FULIZA);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('FULIZA');
        expect(result!.amount).toBe(500);
    });
});

// ---------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------

describe('parseMpesaMessage - Edge Cases', () => {
    it('should return null for empty string', () => {
        expect(parseMpesaMessage('')).toBeNull();
    });

    it('should return null for null input', () => {
        expect(parseMpesaMessage(null as any)).toBeNull();
    });

    it('should return null for undefined input', () => {
        expect(parseMpesaMessage(undefined as any)).toBeNull();
    });

    it('should handle message with extra whitespace', () => {
        const msg = '  THQ5ZPB2TN   Confirmed.   Ksh1,500.00   received from JOHN DOE  0712345678   on 22/12/24 ';
        const result = parseMpesaMessage(msg);

        expect(result).not.toBeNull();
        expect(result!.reference).toBe('THQ5ZPB2TN');
    });

    it('should handle amount without decimal', () => {
        const msg = 'ABC12345DE Confirmed. Ksh1500 received from MARY JANE on 22/12/24. M-PESA balance is Ksh5000.';
        const result = parseMpesaMessage(msg);

        expect(result).not.toBeNull();
        expect(result!.amount).toBe(1500);
    });

    it('should handle large amounts with commas', () => {
        const msg = 'XYZ98765AB Confirmed. Ksh1,234,567.89 received from CORP LTD on 22/12/24. New M-PESA balance is Ksh2,000,000.00.';
        const result = parseMpesaMessage(msg);

        expect(result).not.toBeNull();
        expect(result!.amount).toBe(1234567.89);
    });

    it('should handle different date formats', () => {
        const msgSlash = 'ABC123DEFG Confirmed. Ksh100.00 received from TEST on 22/12/2024.';
        const msgDash = 'DEF456GHIJ Confirmed. Ksh100.00 received from TEST on 22-12-24.';

        const result1 = parseMpesaMessage(msgSlash);
        const result2 = parseMpesaMessage(msgDash);

        expect(result1).not.toBeNull();
        expect(result2).not.toBeNull();
    });
});

// ---------------------------------------------------------------------
// parseMpesaMessages - Batch parsing
// ---------------------------------------------------------------------

describe('parseMpesaMessages', () => {
    it('should parse array of messages and deduplicate', () => {
        const messages = [
            SAMPLE_MESSAGES.RECEIVED,
            SAMPLE_MESSAGES.SENT,
            SAMPLE_MESSAGES.RECEIVED, // duplicate
            'Not an M-PESA message',
        ];

        const results = parseMpesaMessages(messages);

        expect(results.length).toBe(2); // Deduplicated
        expect(results.map(r => r.type)).toContain('RECEIVED');
        expect(results.map(r => r.type)).toContain('SENT');
    });

    it('should handle empty array', () => {
        expect(parseMpesaMessages([])).toEqual([]);
    });
});

// ---------------------------------------------------------------------
// getMpesaSummary
// ---------------------------------------------------------------------

describe('getMpesaSummary', () => {
    it('should calculate summary statistics', () => {
        const transactions = Object.values(SAMPLE_MESSAGES)
            .map(msg => parseMpesaMessage(msg))
            .filter(Boolean) as any[];

        const summary = getMpesaSummary(transactions);

        expect(summary.totalTransactions).toBe(8);
        expect(summary.byType.RECEIVED).toBe(1);
        expect(summary.byType.SENT).toBe(1);
        expect(summary.byType.PAYBILL).toBe(1);
        expect(summary.byType.BUYGOODS).toBe(1);
    });

    it('should handle empty array', () => {
        const summary = getMpesaSummary([]);

        expect(summary.totalTransactions).toBe(0);
        expect(summary.totalReceived).toBe(0);
        expect(summary.totalSent).toBe(0);
    });
});
