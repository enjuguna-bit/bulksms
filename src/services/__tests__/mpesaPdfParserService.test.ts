import { mpesaPdfParserService } from '../mpesaPdfParserService';
import { parsePdf } from '@/native/PdfParser';
import RNFS from 'react-native-fs';

// Mock dependencies
jest.mock('@/native/PdfParser', () => ({
    isPdfParserAvailable: jest.fn(() => true),
    parsePdf: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
    CachesDirectoryPath: '/cache',
    DownloadDirectoryPath: '/downloads',
    DocumentDirectoryPath: '/documents',
    copyFile: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(() => Promise.resolve(true)),
    unlink: jest.fn(),
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
}));

describe('MpesaPdfParserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should parse PDF successfully', async () => {
        const mockPdfText = `
            Title
            THQ5ZPB2TN 2024-12-22 10:30:00
            Completed
            Paid In: 1,500.00
        `;
        (parsePdf as jest.Mock).mockResolvedValue({ success: true, text: mockPdfText });
        (RNFS.copyFile as jest.Mock).mockResolvedValue(undefined);

        const result = await mpesaPdfParserService.parsePdfStatement('content://file', '1234');

        expect(result.success).toBe(true);
        expect(result.transactions.length).toBe(0); // < 5000 default threshold, wait, MIN_AMOUNT is 5000?
        // Let's make it > 5000
    });

    it('should filter high value transactions', async () => {
        const mockPdfText = `
            VC3I 2025-12-12 11:08:06
            Completed
            Paid In: 6,000.00
            Details: Payment from Client
        `;
        (parsePdf as jest.Mock).mockResolvedValue({ success: true, text: mockPdfText });

        const result = await mpesaPdfParserService.parsePdfStatement('file:///test.pdf', '1234');

        expect(result.success).toBe(true);
        expect(result.transactions.length).toBe(1);
        expect(result.transactions[0].paidIn).toBe(6000);
    });

    it('should export to JSON', async () => {
        const transactions = [{
            id: '1',
            date: '2025-01-01',
            time: '10:00:00',
            amount: 5000,
            paidIn: 5000,
            details: 'Test',
            status: 'Completed',
            depotNo: 'ABC',
            completionTime: '2025-01-01 10:00:00',
            rawLine: '',
        }];

        (RNFS.writeFile as jest.Mock).mockResolvedValue(undefined);

        const path = await mpesaPdfParserService.exportToJson(transactions);

        expect(RNFS.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('.json'),
            expect.stringContaining('"paidIn": 5000'),
            'utf8'
        );
        expect(path).toContain('.json');
    });
});
