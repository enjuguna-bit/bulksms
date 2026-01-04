module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/utils/fileSystemHealth$': '<rootDir>/src/__mocks__/fileSystemHealth.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shopify/flash-list$': '<rootDir>/src/__mocks__/@shopify/flash-list.tsx',
    '^react-native-webview$': '<rootDir>/src/__mocks__/react-native-webview.tsx',
    '^@notifee/react-native$': '<rootDir>/src/mocks/notifee.js',
    '\\.(mp3|png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|@react-native-async-storage|@shopify|lucide-react-native|jose|@op-engineering/op-sqlite|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-blob-util|react-native-share|react-native-contacts|react-native-document-picker|expo-linear-gradient|react-native-fs|react-native-webview)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
  ],
};
