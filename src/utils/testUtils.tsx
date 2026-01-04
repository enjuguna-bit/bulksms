// Enhanced test utilities for React Native Bulk SMS app
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MessageProvider } from '@/providers/MessageProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

// Mock implementations for testing
export const mockPermissions = {
  READ_SMS: true,
  RECEIVE_SMS: true,
  SEND_SMS: true,
  READ_CONTACTS: true,
  SYSTEM_ALERT_WINDOW: false,
  allGranted: true,
  missingPermissions: [],
  impactMessage: '',
};

export const mockContacts = [
  {
    id: '1',
    name: 'John Doe',
    phoneNumbers: ['+254712345678'],
  },
  {
    id: '2',
    name: 'Jane Smith',
    phoneNumbers: ['+254798765432'],
  },
];

export const mockConversations = [
  {
    id: 1,
    recipientName: 'John Doe',
    recipientPhone: '+254712345678',
    lastMessageAt: Date.now() - 3600000, // 1 hour ago
    unreadCount: 2,
    snippet: 'Hello, how are you?',
  },
  {
    id: 2,
    recipientName: 'Jane Smith',
    recipientPhone: '+254798765432',
    lastMessageAt: Date.now() - 86400000, // 1 day ago
    unreadCount: 0,
    snippet: 'Meeting at 3 PM',
  },
];

export const mockMessages = [
  {
    id: 1,
    conversationId: 1,
    body: 'Hello, how are you?',
    type: 'incoming' as const,
    status: 'sent' as const,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 2,
    conversationId: 1,
    body: 'I\'m doing well, thank you!',
    type: 'outgoing' as const,
    status: 'delivered' as const,
    timestamp: Date.now() - 1800000,
  },
];

// Custom render function with all providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    <ToastProvider>
      <MessageProvider>
        {children}
      </MessageProvider>
    </ToastProvider>
  </ThemeProvider>
);

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };

// Test utilities
export const testUtils = {
  // Wait for component to finish animations/interactions
  waitForInteractions: () =>
    new Promise(resolve => setTimeout(resolve, 100)),

  // Mock async storage
  mockAsyncStorage: () => {
    const mockStorage: { [key: string]: string } = {};

    return {
      getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
    };
  },

  // Mock permissions
  mockPermissionsAPI: (permissions = mockPermissions) => ({
    checkSmsAndContactPermissionsDetailed: jest.fn(() => Promise.resolve(permissions)),
    requestSmsAndContactPermissionsDetailed: jest.fn(() => Promise.resolve(permissions)),
  }),

  // Mock contacts
  mockContactsAPI: (contacts = mockContacts) => ({
    ensureContactsPermission: jest.fn(() => Promise.resolve(true)),
    getAllContacts: jest.fn(() => Promise.resolve(contacts)),
  }),

  // Mock navigation
  mockNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
  }),

  // Mock database
  mockDatabase: () => ({
    getConversations: jest.fn(() => Promise.resolve(mockConversations)),
    getMessages: jest.fn(() => Promise.resolve(mockMessages)),
    getTotalUnreadCount: jest.fn(() => Promise.resolve(2)),
    initMessagingSchema: jest.fn(() => Promise.resolve()),
  }),

  // Generate test data
  generateTestRecipients: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      name: `Test User ${i + 1}`,
      phone: `+2547${String(i + 1).padStart(8, '0')}`,
      amount: i > 0 ? Math.floor(Math.random() * 10000) + 1000 : undefined,
      fields: i > 2 ? { customField: `value${i}` } : undefined,
    }));
  },

  // Test helpers for common assertions
  expectToBeVisible: (element: any) => {
    expect(element).toBeTruthy();
    expect(element.props.style?.display).not.toBe('none');
  },

  expectToHaveText: (element: any, text: string) => {
    expect(element.children?.join('') || element.children).toContain(text);
  },

  expectToHaveStyle: (element: any, style: any) => {
    expect(element.props.style).toMatchObject(style);
  },
};
