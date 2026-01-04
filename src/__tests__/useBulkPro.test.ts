import { renderHook, act } from '@testing-library/react-hooks';
import { useBulkPro } from '../hooks/useBulkPro';
import { SecureStorage } from '@/utils/SecureStorage';
import { uploadPersistence } from '@/services/uploadPersistence';

// Mock dependencies
jest.mock('@/utils/SecureStorage');
jest.mock('@/services/uploadPersistence');
jest.mock('@react-native-async-storage/async-storage');

// Mock DeviceEventEmitter within react-native
jest.mock('react-native', () => {
  return {
    Platform: { OS: 'android', select: jest.fn(options => options.android) },
    StyleSheet: { create: jest.fn(styles => styles), flatten: jest.fn() },
    Dimensions: { get: jest.fn().mockReturnValue({ width: 375, height: 812 }) },
    Animated: {
      Value: jest.fn(() => ({
        interpolate: jest.fn(),
        setValue: jest.fn(),
      })),
      timing: jest.fn(() => ({ start: jest.fn() })),
      view: 'View',
      createAnimatedComponent: jest.fn(c => c),
    },
    View: 'View',
    Text: 'Text',
    Alert: { alert: jest.fn() },
    InteractionManager: { runAfterInteractions: jest.fn(cb => cb()) },
    NativeModules: {
      SmsReaderModule: { getAll: jest.fn(), getThreadByAddress: jest.fn(), getMessageCount: jest.fn() },
      SmsSenderModule: { sendSms: jest.fn(), canSendSms: jest.fn(() => Promise.resolve(true)) },
      SmsListenerModule: { addListener: jest.fn(), removeListeners: jest.fn() },
      RoleHelperModule: {},
      DefaultSmsRoleModule: {},
      DevBypassBridgeModule: {},
      BulkSmsSchedulerModule: {},
    },
    DeviceEventEmitter: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
    },
  };
});

const mockSecureStorage = SecureStorage as jest.Mocked<typeof SecureStorage>;
const mockUploadPersistence = uploadPersistence as jest.Mocked<typeof uploadPersistence>;

describe('useBulkPro', () => {
  beforeEach(() => {
    mockSecureStorage.getItem.mockResolvedValue(null);
    mockSecureStorage.setItem.mockResolvedValue();
    mockUploadPersistence.loadCurrentUpload.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Spy on DeviceEventEmitter
  // Already mocked in jest.mock('react-native') above


  it('initializes with empty state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useBulkPro());
    await waitForNextUpdate();

    expect(result.current.mode).toBe('excel');
    expect(result.current.template).toBeDefined();
    expect(result.current.excelRows).toEqual([]);
  });

  it('handles CSV import', async () => {
    const { result } = renderHook(() => useBulkPro());

    await act(async () => {
      await result.current.handlePickCsv();
    });

    expect(result.current.importLoading).toBe(false);
    // Add more assertions based on expected CSV handling
  });

  it('toggles pause state', async () => {
    const { result } = renderHook(() => useBulkPro());

    await act(async () => {
      result.current.togglePause();
    });

    expect(result.current.paused).toBe(true);
  });
});
