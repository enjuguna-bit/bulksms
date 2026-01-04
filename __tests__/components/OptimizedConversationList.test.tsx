import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { OptimizedConversationList } from '@/components/optimized/OptimizedConversationList';
import { render, testUtils, mockConversations } from '@/utils/testUtils';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('OptimizedConversationList', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders conversations correctly', () => {
    const { getByText, getAllByText } = render(
      <OptimizedConversationList conversations={mockConversations} />
    );

    // Check if conversation names are displayed
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();

    // Check if snippets are displayed
    expect(getByText('Hello, how are you?')).toBeTruthy();
    expect(getByText('Meeting at 3 PM')).toBeTruthy();

    // Check unread count badge
    expect(getAllByText('2')).toBeTruthy();
  });

  it('renders phone number when name is missing', () => {
    const unnamedConversation = [{
      ...mockConversations[0],
      recipientName: '',
    }];

    const { getByText } = render(
      <OptimizedConversationList conversations={unnamedConversation} />
    );

    expect(getByText('+254712345678')).toBeTruthy();
  });

  it('shows loading state', () => {
    const { getByText } = render(
      <OptimizedConversationList conversations={[]} loading={true} />
    );

    expect(getByText('Loading conversations...')).toBeTruthy();
  });

  it('shows empty state when no conversations', () => {
    const { getByText } = render(
      <OptimizedConversationList conversations={[]} />
    );

    expect(getByText('No conversations yet')).toBeTruthy();
  });

  it('navigates to conversation on press', () => {
    const { getByText } = render(
      <OptimizedConversationList conversations={mockConversations} />
    );

    const johnDoeItem = getByText('John Doe').parent?.parent;
    fireEvent.press(johnDoeItem!);

    expect(mockNavigate).toHaveBeenCalledWith('Conversation', {
      conversationId: 1,
      address: '+254712345678',
    });
  });

  it('displays unread count badges correctly', () => {
    const { getByText, queryByText } = render(
      <OptimizedConversationList conversations={mockConversations} />
    );

    // John Doe should have unread badge
    expect(getByText('2')).toBeTruthy();

    // Jane Smith should not have unread indicator in text (badge shows count)
    // The badge component shows the count, so we can't easily test the visual
  });

  it('formats timestamps correctly', () => {
    const recentConversation = [{
      ...mockConversations[0],
      lastMessageAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    }];

    const { getByText } = render(
      <OptimizedConversationList conversations={recentConversation} />
    );

    // Should show time format for recent messages
    const timeElement = getByText(/\d{1,2}:\d{2}/);
    expect(timeElement).toBeTruthy();
  });

  it('handles refresh functionality', async () => {
    const mockOnRefresh = jest.fn();

    const { getByTestId } = render(
      <OptimizedConversationList
        conversations={mockConversations}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />
    );

    // Note: FlashList refresh testing might require additional setup
    // This is a placeholder for refresh testing
  });
});
