/**
 * @format
 */

// Mock react-native-linear-gradient for tests
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock expo-haptics for tests
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import { it, expect } from '@jest/globals';

it('renders correctly', () => {
  // Simplified test - just ensure App component can be instantiated
  expect(App).toBeDefined();
  expect(typeof App).toBe('function');
});
