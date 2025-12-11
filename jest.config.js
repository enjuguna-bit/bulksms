module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|@react-native-async-storage|@shopify/flash-list|lucide-react-native|jose|@op-engineering/op-sqlite|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-blob-util|react-native-share|react-native-contacts|react-native-document-picker|expo-linear-gradient|react-native-fs)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
  ],
};
