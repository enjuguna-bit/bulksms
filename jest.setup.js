import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock op-sqlite
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(),
    transaction: jest.fn(),
  })),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0'),
  getBuildNumber: jest.fn(() => '1'),
}));

// Mock Platform for QueueTest
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'android',
    select: jest.fn((obj) => obj.android),
}));

// Mock react-native-blob-util
jest.mock('react-native-blob-util', () => ({
    DocumentDir: '/mock/path/document',
    CacheDir: '/mock/path/cache',
    fs: {
        writeFile: jest.fn(() => Promise.resolve()),
        readFile: jest.fn(() => Promise.resolve('')),
        dirs: {
            DocumentDir: '/mock/path/document',
            CacheDir: '/mock/path/cache',
            DownloadDir: '/mock/path/download',
        },
        exists: jest.fn(() => Promise.resolve(true)),
    },
    config: jest.fn(() => ({
        fetch: jest.fn(() => Promise.resolve({
            info: () => ({ status: 200 }),
            path: () => '/mock/path/file',
        })),
    })),
}));

// Mock @react-native-clipboard/clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
  hasString: jest.fn(() => Promise.resolve(true)),
}));

// Mock react-native-share
jest.mock('react-native-share', () => ({
    default: {
        open: jest.fn(),
        shareSingle: jest.fn(),
    },
}));

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
    pick: jest.fn(),
    pickSingle: jest.fn(),
    types: {
        allFiles: 'allFiles',
        images: 'images',
        plainText: 'plainText',
        audio: 'audio',
        pdf: 'pdf',
        zip: 'zip',
        csv: 'csv',
        xls: 'xls',
        xlsx: 'xlsx',
    },
    isCancel: jest.fn(),
}));
