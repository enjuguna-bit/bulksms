import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BulkSMSPro from '../screens/main/bulk-pro';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { useBulkPro } from '@/hooks/useBulkPro';

// Mock dependencies
jest.mock('@/theme/ThemeProvider');
jest.mock('@/hooks/useBulkPro');
jest.mock('@/providers/BillingProvider', () => ({
  useBilling: jest.fn(() => ({
    hasActiveAccess: true,
  })),
}));

// Mock child components
jest.mock('@/components/bulk-pro/BulkProHeader', () => {
  const { Text } = require('react-native');
  return () => <Text>BulkSMS Pro</Text>;
});
jest.mock('@/components/bulk-pro/Pill', () => {
  const { Text } = require('react-native');
  return ({ label, onPress }: any) => <Text onPress={onPress}>{label}</Text>;
});
jest.mock('@/components/bulk-pro/BulkProTemplate', () => 'BulkProTemplate');
jest.mock('@/components/bulk-pro/BulkProProgress', () => {
  const { Text } = require('react-native');
  return ({ sent, total }: any) => <Text>Sending {sent}/{total}</Text>;
});
jest.mock('@/components/bulk-pro/RecipientsModal', () => 'RecipientsModal');
jest.mock('@/components/bulk-pro/EditModal', () => 'EditModal');
jest.mock('@/components/bulk-pro/SessionManager', () => 'SessionManager');
jest.mock('@/components/HeaderMappingModal', () => 'HeaderMappingModal');
jest.mock('@/components/ProtectedRoute', () => ({ children }: { children: any }) => children);

jest.mock('@/hooks/useSafeRouter', () => ({
  useSafeRouter: jest.fn(() => ({ safePush: jest.fn() })),
}));

jest.mock('@/utils/performance/listOptimizations', () => ({
  getLargeDatasetListProps: jest.fn(() => ({})),
  getFixedHeightListProps: jest.fn(() => ({})),
}));

const mockUseThemeSettings = useThemeSettings as jest.Mock;
const mockUseBulkPro = useBulkPro as jest.Mock;

describe('BulkSMSPro', () => {
  beforeEach(() => {
    mockUseThemeSettings.mockReturnValue({
      colors: {
        text: 'black',
        subText: 'gray',
        border: 'lightgray',
        background: 'white',
      },
    });

    mockUseBulkPro.mockReturnValue({
      mode: 'excel',
      setMode: jest.fn(),
      template: 'Hello {name}',
      setTemplate: jest.fn(),
      excelRows: [],
      setExcelRows: jest.fn(),
      clearExcelRows: jest.fn(),
      sending: false,
      sent: 0,
      failed: 0,
      queued: 0,
      paused: false,
      handleSend: jest.fn(),
      mergedRecipients: [],
      query: '',
      setQuery: jest.fn(),
      contacts: [],
      selectedIds: new Set(),
      setSelectedIds: jest.fn(),
      headers: [],
      sampleRows: [],
      allRawRows: [],
      amountCandidates: [],
      showMappingModal: false,
      setShowMappingModal: jest.fn(),
      contactsLoading: false,
      sendSpeed: 1000,
      setSendSpeed: jest.fn(),
      togglePause: jest.fn(),
      stopSending: jest.fn(),
      smsStatus: {},
      runQueueNow: jest.fn(),
      formatMessage: jest.fn(),
      normalizePhone: jest.fn(),
      activeSession: null,
      showResumePrompt: false,
      handleSessionResume: jest.fn(),
      handleSessionDiscard: jest.fn(),
      sessionLoading: false,
      queueStatus: { pending: 0, exhausted: 0 },
      clearExhausted: jest.fn(),
      recents: [],
      saveTemplate: jest.fn(),
      clearRecents: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bulk SMS interface', () => {
    render(<BulkSMSPro />);
    expect(screen.getByText('BulkSMS Pro')).toBeTruthy();
    expect(screen.getByText('Import from Excel')).toBeTruthy();
    expect(screen.getByText('Select Contacts')).toBeTruthy();
  });

  it('switches between excel and contacts mode', () => {
    const setMode = jest.fn();
    mockUseBulkPro.mockReturnValue({
      ...mockUseBulkPro(),
      setMode,
    });

    render(<BulkSMSPro />);

    fireEvent.press(screen.getByText('Select Contacts'));
    expect(setMode).toHaveBeenCalledWith('contacts');
  });

  it('shows sending progress when messages are being sent', () => {
    mockUseBulkPro.mockReturnValue({
      ...mockUseBulkPro(),
      sending: true,
      sent: 5,
      mergedRecipients: Array(10).fill({}),
    });

    render(<BulkSMSPro />);
    expect(screen.getByText('Sending 5/10')).toBeTruthy();
  });
});
