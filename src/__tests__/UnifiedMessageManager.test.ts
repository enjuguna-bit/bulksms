import { UnifiedMessageManager } from '../services/unifiedMessageService';
import { sendSingleSms, SmsError } from '../services/smsService';
import { getOrCreateConversation, insertMessage, updateMessageStatus } from '@/db/messaging';
import { smsRole } from '@/native';

// Mock dependencies
jest.mock('../services/smsService');
jest.mock('@/db/messaging');
jest.mock('@/native');

const mockSendSingleSms = sendSingleSms as jest.Mock;
const mockGetOrCreateConversation = getOrCreateConversation as jest.Mock;
const mockInsertMessage = insertMessage as jest.Mock;
const mockUpdateMessageStatus = updateMessageStatus as jest.Mock;
const mockSmsRole = smsRole as jest.Mocked<typeof smsRole>;

describe('UnifiedMessageManager', () => {
  beforeEach(() => {
    mockGetOrCreateConversation.mockResolvedValue({ id: 1 });
    mockInsertMessage.mockResolvedValue({ id: 2 });
    mockSmsRole.isDefault.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('successfully sends a message', async () => {
      mockSendSingleSms.mockResolvedValue({ success: true });
      
      const result = await UnifiedMessageManager.sendMessage({
        address: '+254712345678',
        body: 'Test message',
      });
      
      expect(result.success).toBe(true);
      expect(mockInsertMessage).toHaveBeenCalled();
    });

    it('handles message send failure', async () => {
      mockSendSingleSms.mockResolvedValue({ 
        success: false,
        error: 'Failed to send'
      });
      
      const result = await UnifiedMessageManager.sendMessage({
        address: '+254712345678',
        body: 'Test message',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send');
    });

    it('handles permission denied errors', async () => {
      mockSendSingleSms.mockResolvedValue({ 
        success: false,
        error: SmsError.PERMISSION_DENIED
      });
      
      const result = await UnifiedMessageManager.sendMessage({
        address: '+254712345678',
        body: 'Test message',
      });
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(SmsError.PERMISSION_DENIED);
    });
  });

  describe('sendBulk', () => {
    it('processes bulk messages in chunks', async () => {
      mockSendSingleSms.mockResolvedValue({ success: true });
      
      const result = await UnifiedMessageManager.sendBulk({
        recipients: Array(100).fill('+254712345678'),
        body: 'Bulk message',
        chunkSize: 50,
      });
      
      expect(result.successful).toBe(100);
      expect(result.failed).toBe(0);
    });

    it('pre-checks bulk send conditions', async () => {
      const check = await UnifiedMessageManager.preBulkCheck(100);
      expect(check.canProceed).toBe(true);
    });

    it('handles bulk send with failures', async () => {
      mockSendSingleSms.mockResolvedValueOnce({ success: true });
      mockSendSingleSms.mockResolvedValueOnce({ success: false });
      
      const result = await UnifiedMessageManager.sendBulk({
        recipients: ['+254712345678', '+254787654321'],
        body: 'Bulk message',
      });
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
