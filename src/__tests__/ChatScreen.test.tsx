import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ChatScreenNew from '../screens/messaging/ChatScreenNew';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { useMessages } from '@/providers/MessageProvider';
import { UnifiedMessageManager } from '@/services/unifiedMessageService';

// Mock dependencies
jest.mock('@/theme/ThemeProvider');
jest.mock('@/providers/MessageProvider');
jest.mock('@/services/unifiedMessageService');
jest.mock('@/utils/FileSystemHealth', () => ({
  FileSystemHealth: {
    checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
  },
}));
jest.mock('@/db/database', () => ({
  db: {
    executeSql: jest.fn().mockResolvedValue([{ rows: { item: () => ({}) }, insertId: 1 }]),
  },
  runQuery: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/db/messaging', () => ({
  getConversationById: jest.fn().mockResolvedValue({ id: 1, recipientNumber: '+254712345678' }),
  getOrCreateConversation: jest.fn().mockResolvedValue({ id: 1, recipientNumber: '+254712345678' }),
  getMessages: jest.fn().mockResolvedValue([
    { id: 1, body: 'Hello there', direction: 'incoming', timestamp: Date.now(), status: 'read' }
  ]),
  insertMessage: jest.fn().mockResolvedValue({ id: 2 }),
  updateMessageStatus: jest.fn().mockResolvedValue(true),
  markConversationAsRead: jest.fn().mockResolvedValue(true),
  saveDraft: jest.fn().mockResolvedValue(true),
  formatTimestamp: jest.fn((ts) => '10:00 AM'),
}));

const mockUseThemeSettings = useThemeSettings as jest.Mock;
const mockUseMessages = useMessages as jest.Mock;
const mockUnifiedMessageManager = UnifiedMessageManager as jest.Mocked<typeof UnifiedMessageManager>;

describe('ChatScreen', () => {
  const mockRoute = {
    params: {
      address: '+254712345678',
      name: 'John Doe',
    },
  };

  beforeEach(() => {
    mockUseThemeSettings.mockReturnValue({
      colors: {
        text: 'black',
        subText: 'gray',
        border: 'lightgray',
        background: 'white',
      },
      theme: 'light',
    });

    mockUseMessages.mockReturnValue({
      getThreadMessages: jest.fn().mockResolvedValue([
        {
          id: 1,
          direction: 'incoming',
          body: 'Hello there',
          timestamp: Date.now(),
          status: 'read',
        },
      ]),
      markThreadRead: jest.fn(),
    });

    mockUnifiedMessageManager.sendMessage.mockResolvedValue({
      success: true,
      messageId: 2,
    });

    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders messages from the thread', async () => {
    render(<ChatScreenNew route={mockRoute} navigation={jest.fn() as any} />);
    await act(async () => { }); // Wait for useEffect
    expect(screen.getByText('Hello there')).toBeTruthy();
  });

  it('sends a message when input is submitted', async () => {
    render(<ChatScreenNew route={mockRoute} navigation={jest.fn() as any} />);
    await act(async () => { }); // Wait for useEffect

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Test message');
    fireEvent.press(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(mockUnifiedMessageManager.sendMessage).toHaveBeenCalledWith({
        address: '+254712345678',
        body: 'Test message',
      });
    });
  });

  it('shows error when message fails to send', async () => {
    mockUnifiedMessageManager.sendMessage.mockResolvedValue({
      success: false,
      error: 'Failed to send',
    });

    render(<ChatScreenNew route={mockRoute} navigation={jest.fn() as any} />);
    await act(async () => { }); // Wait for useEffect

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Test message');
    fireEvent.press(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Send Failed', 'Failed to send');
    });
  });
});
