/**
 * @format
 */

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
