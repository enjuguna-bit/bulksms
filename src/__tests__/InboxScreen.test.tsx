import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import InboxScreen from '../screens/messaging/InboxScreen';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getConversations, syncMessageFromNative } from '@/db/messaging';
import type { Conversation } from '@/db/messaging';

// Mock dependencies
// Mock dependencies
jest.mock('@/theme/ThemeProvider');
jest.mock('@/hooks/useSafeRouter');
jest.mock('@/db/messaging');
jest.mock('@/screens/messaging/ConversationItem', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ conversation, onPress }: { conversation: any, onPress: () => void }) => (
    <TouchableOpacity onPress={onPress}>
      <Text>{conversation.recipientName}</Text>
      <Text>{conversation.snippet}</Text>
    </TouchableOpacity>
  );
});
jest.mock('@/components/ui/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
  };
});

// Mock @/native
jest.mock('@/native', () => ({
  smsListener: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  smsReader: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/screens/messaging/ConversationItem', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ conversation, onPress }: { conversation: any, onPress: () => void }) => (
    <TouchableOpacity onPress={onPress}>
      <Text>{conversation.recipientName}</Text>
      <Text>{conversation.snippet}</Text>
    </TouchableOpacity>
  );
});

const mockUseThemeSettings = useThemeSettings as jest.MockedFunction<typeof useThemeSettings>;
const mockUseSafeRouter = useSafeRouter as jest.MockedFunction<typeof useSafeRouter>;
const mockGetConversations = getConversations as jest.MockedFunction<typeof getConversations>;

describe('InboxScreen', () => {
  const mockThemePalette = {
    text: 'black',
    subText: 'gray',
    border: 'lightgray',
    background: 'white',
    accent: 'blue',
    card: 'white',
    chip: 'gray',
    surface: 'white',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    primary600: 'blue',
    gradientPrimary: ['blue', 'darkblue'],
    gradientSuccess: ['green', 'darkgreen'],
    gradientError: ['red', 'darkred'],
    gradientWarning: ['yellow', 'darkyellow'],
    shadow: {}
  };

  const mockConversation: Conversation = {
    id: 1,
    threadId: 'thread-1',
    recipientNumber: '+254712345678',
    recipientName: 'John Doe',
    lastMessageTimestamp: Date.now(),
    snippet: 'Hello there',
    unreadCount: 1,
    archived: false,
    pinned: false,
    color: 0xFF6B6B,
    muted: false,
    draftText: null,
    draftSavedAt: null,
    avatarUri: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  beforeEach(() => {
    mockUseThemeSettings.mockReturnValue({
      mode: 'light',
      setMode: jest.fn(),
      highContrast: false,
      setHighContrast: jest.fn(),
      largeText: false,
      setLargeText: jest.fn(),
      scheme: 'light',
      theme: 'light',
      colors: mockThemePalette,
    });

    mockUseSafeRouter.mockReturnValue({
      ready: true,
      safePush: jest.fn(),
      safeReplace: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
      navigation: {}
    });

    mockGetConversations.mockResolvedValue([mockConversation]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    render(<InboxScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    await waitFor(() => { });
  });

  it('renders conversation list after loading', async () => {
    render(<InboxScreen />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Hello there')).toBeTruthy();
    });
  });

  it('navigates to chat when conversation is pressed', async () => {
    const mockPush = jest.fn();
    mockUseSafeRouter.mockReturnValue({
      ...mockUseSafeRouter(),
      safePush: mockPush
    });

    render(<InboxScreen />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeTruthy());

    fireEvent.press(screen.getByText('John Doe'));
    expect(mockPush).toHaveBeenCalled();
  });

  it('shows error message when loading fails', async () => {
    mockGetConversations.mockRejectedValue(new Error('Failed to load'));
    render(<InboxScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });

  it('handles refresh action', async () => {
    render(<InboxScreen />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    const initialCalls = mockGetConversations.mock.calls.length;

    fireEvent(screen.getByTestId('refresh-control'), 'refresh');

    await waitFor(() => {
      expect(mockGetConversations).toHaveBeenCalledTimes(initialCalls + 1);
    });
  });

  it('renders empty state correctly', async () => {
    mockGetConversations.mockResolvedValue([]);
    render(<InboxScreen />);

    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeTruthy();
      expect(screen.getByText('Start a new message to begin')).toBeTruthy();
    });
  });

  it('renders multiple conversations correctly', async () => {
    const mockConversations: Conversation[] = Array(5).fill(0).map((_, i) => ({
      id: i,
      threadId: `thread-${i}`,
      recipientNumber: `+2547${i.toString().padStart(8, '0')}`,
      recipientName: `Contact ${i}`,
      lastMessageTimestamp: Date.now() - i * 1000,
      snippet: `Test message ${i}`,
      unreadCount: 1,
      archived: false,
      pinned: false,
      color: 0xFF6B6B,
      muted: false,
      draftText: null,
      draftSavedAt: null,
      avatarUri: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    // Mock the initial conversations load
    mockGetConversations.mockResolvedValue(mockConversations);

    render(<InboxScreen />);

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Contact 0')).toBeTruthy();
      expect(screen.getByText('Test message 0')).toBeTruthy();
    });

    // Check that multiple conversations are rendered
    expect(screen.getByText('Contact 1')).toBeTruthy();
    expect(screen.getByText('Contact 2')).toBeTruthy();
  });
});
