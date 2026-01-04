// jest.setup.js
// ============================================================================
// File System Health Mock (GLOBAL)
// ============================================================================
jest.mock('@/utils/fileSystemHealth', () => ({
  FileSystemHealth: {
    checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
  },
}), { virtual: true });

// Jest setup file for mocking native modules and environment
// This runs before all tests

// ============================================================================
// Env Mock
// ============================================================================
jest.mock('@env', () => ({
  LIPANA_API_KEY: 'test-api-key',
  LIPANA_PUBLIC_KEY: 'test-public-key',
  SENTRY_DSN: 'test-sentry-dsn',
}), { virtual: true });

// ============================================================================
// AsyncStorage Mock (Required for theme and storage operations)
// ============================================================================
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async () => null),
    getItem: jest.fn(async () => null),
    removeItem: jest.fn(async () => null),
    removeItems: jest.fn(async () => null),
    clear: jest.fn(async () => null),
    getAllKeys: jest.fn(async () => []),
    multiSet: jest.fn(async () => null),
    multiGet: jest.fn(async () => []),
    multiRemove: jest.fn(async () => null),
  },
}));

// ============================================================================
// NetInfo Mock
// ============================================================================
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  fetch: jest.fn(async () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// ============================================================================
// Keychain Mock
// ============================================================================
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => ({ username: 'user', password: 'password' })),
  resetGenericPassword: jest.fn(async () => true),
  ACCESS_CONTROL: {
    USER_PRESENCE: 'UserPresence',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  },
  AUTHENTICATION_TYPE: {
    BIOMETRICS_ANY: 'BiometricsAny',
  },
}));

// ============================================================================
// React Native Platform Mock (Must come before any react-native imports)
// ============================================================================
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: {
    OS: 'android',
    select: jest.fn(obj => obj.android || obj.default),
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      SEND_SMS: 'android.permission.SEND_SMS',
      READ_CONTACTS: 'android.permission.READ_CONTACTS',
      READ_PHONE_STATE: 'android.permission.READ_PHONE_STATE',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: jest.fn(async () => true),
    request: jest.fn(async () => 'granted'),
    requestMultiple: jest.fn(async () => ({ 'android.permission.SEND_SMS': 'granted' })),
  },
  Alert: {
    alert: jest.fn(),
    prompt: jest.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  RefreshControl: 'RefreshControl',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  TouchableOpacity: 'TouchableOpacity',
  FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent, refreshControl, ...props }) => {
    const React = require('react');
    const isEmpty = !data || data.length === 0;

    return React.createElement('View', props,
      refreshControl,
      isEmpty ? (ListEmptyComponent || null) : (
        data.map((item, index) =>
          React.createElement('View', { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem({ item, index })
          )
        )
      )
    );
  },
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (obj) => obj,
    flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
  },
  useColorScheme: jest.fn(() => 'light'),
  InteractionManager: {
    runAfterInteractions: jest.fn((cb) => {
      cb();
      return { cancel: jest.fn() };
    }),
  },
  // Add these to prevent errors
  Linking: {
    openURL: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Dimensions: {
    get: jest.fn((name) => ({
      width: 390,
      height: 844,
      scale: 1,
      fontScale: 1,
    })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
  },
  Keyboard: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    dismiss: jest.fn(),
  },
  Image: {
    resolveAssetSource: jest.fn(),
  },
  NativeModules: {
    SmsModule: {
      send: jest.fn(),
      getSimCount: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  UIManager: {
    setLayoutAnimationEnabledExperimental: jest.fn(),
    getViewManagerConfig: jest.fn(),
  },
  LayoutAnimation: {
    Types: {
      linear: 'linear',
      keyboard: 'keyboard',
    },
    Properties: {
      opacity: 'opacity',
      scaleXY: 'scaleXY',
    },
    Presets: {
      easeInEaseOut: jest.fn(),
      linear: jest.fn(),
      spring: jest.fn(),
    },
    configureNext: jest.fn(),
  },
}), { virtual: true });

// ============================================================================
// Navigation Mock
// ============================================================================
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    push: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
  useIsFocused: jest.fn(() => true),
  useFocusEffect: jest.fn((cb) => {
    // Call the effect immediately in tests
    cb();
  }),
  NavigationContainer: ({ children }) => children,
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// ============================================================================
// OP-SQLite Mock
// ============================================================================
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn((config) => ({
    execute: jest.fn(async (sql) => ({ rows: [] })),
    executeBatch: jest.fn(async (queries) => []),
    close: jest.fn(async () => null),
    transaction: jest.fn(async (callback) => callback()),
  })),
  close: jest.fn(async () => null),
}));

// ============================================================================
// Native SMS Module Mock
// ============================================================================
jest.mock('../src/native', () => ({
  smsSender: {
    send: jest.fn(async () => true),
    getSimCount: jest.fn(async () => 1),
    sendMultiple: jest.fn(async () => true),
  },
}), { virtual: true });

// ============================================================================
// React Native Blob Util Mock
// ============================================================================
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: {
        DocumentDir: '/documents',
        CacheDir: '/cache',
        DownloadDir: '/downloads',
      },
      writeFile: jest.fn(async () => '/path'),
      readFile: jest.fn(async () => 'content'),
      removeFile: jest.fn(async () => null),
      exists: jest.fn(async () => true),
      mkdir: jest.fn(async () => null),
    },
    fetch: jest.fn(async () => ({
      path: jest.fn(() => '/path'),
      base64: jest.fn(() => 'base64data'),
      text: jest.fn(async () => 'text'),
      json: jest.fn(async () => ({})),
      respInfo: {
        status: 200,
        headers: {},
      },
    })),
    config: jest.fn(),
  },
}));

// ============================================================================
// Device Info Mock
// ============================================================================
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'test-device-id'),
  getDeviceId: jest.fn(() => 'test-device'),
  getModel: jest.fn(() => 'test-model'),
  getSystemVersion: jest.fn(() => '13.0'),
  isTablet: jest.fn(() => false),
}));

// ============================================================================
// React Native Share Mock
// ============================================================================
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(async () => null),
    setBackgroundImage: jest.fn(async () => null),
  },
}));

// ============================================================================
// React Native Contacts Mock
// ============================================================================
jest.mock('react-native-contacts', () => ({
  __esModule: true,
  openContactForm: jest.fn(async () => ({})),
  openExistingContact: jest.fn(async () => ({})),
  getAll: jest.fn(async () => []),
  getAllWithoutPhotos: jest.fn(async () => []),
  getContactById: jest.fn(async () => ({})),
  addContact: jest.fn(async () => null),
  updateContact: jest.fn(async () => null),
  deleteContact: jest.fn(async () => null),
  hasPHONEPermission: jest.fn(async () => false),
  checkPermission: jest.fn(async () => null),
  requestPermission: jest.fn(async () => null),
}));

// ============================================================================
// React Native Document Picker Mock
// ============================================================================
jest.mock('react-native-document-picker', () => {
  const isCancel = jest.fn(() => false);
  const isInProgress = jest.fn(() => false);
  return {
    __esModule: true,
    default: {
      pick: jest.fn(async () => ({
        uri: 'file://path',
        name: 'file.csv',
        size: 1000,
        type: 'text/csv',
      })),
      pickDirectory: jest.fn(async () => ({
        uri: 'file://path',
      })),
      pickMultiple: jest.fn(async () => []),
      isCancel,
      isInProgress,
    },
    isCancel,
    isInProgress,
    DocumentPickerResponse: jest.fn(),
  }
});

// ============================================================================
// Expo Linear Gradient Mock
// ============================================================================
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

// ============================================================================
// React Native File System (FS) Mock
// ============================================================================
jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    MainBundlePath: '/bundle',
    CachesDirectoryPath: '/cache',
    DocumentDirectoryPath: '/documents',
    LibraryDirectoryPath: '/library',
    LogDirectoryPath: '/log',
    TemporaryDirectoryPath: '/temp',
    readDir: jest.fn(async () => []),
    readFile: jest.fn(async () => 'content'),
    writeFile: jest.fn(async () => null),
    deleteFile: jest.fn(async () => null),
    moveFile: jest.fn(async () => null),
    copyFile: jest.fn(async () => null),
    exists: jest.fn(async () => true),
    mkdir: jest.fn(async () => null),
    stat: jest.fn(async () => ({ size: 1000 })),
    unlink: jest.fn(async () => null),
  },
}));

// ============================================================================
// Gesture Handler Mock
// ============================================================================
jest.mock('react-native-gesture-handler', () => ({
  GestureHandler: jest.fn(),
  GestureHandlerRootView: ({ children }) => children,
  PanGestureHandler: ({ children }) => children,
  TapGestureHandler: ({ children }) => children,
  LongPressGestureHandler: ({ children }) => children,
  Swipeable: ({ children }) => children,
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  RawButton: 'RawButton',
  BaseButton: 'BaseButton',
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
}));

// ============================================================================
// Reanimated Mock
// ============================================================================
jest.mock('react-native-reanimated', () => ({
  Animated: {
    createAnimatedComponent: jest.fn(component => component),
    timing: jest.fn(),
    Value: jest.fn(),
  },
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
  },
  useAnimatedStyle: jest.fn(() => ({})),
  useSharedValue: jest.fn(),
  useDerivedValue: jest.fn(),
  interpolate: jest.fn(),
  interpolateColor: jest.fn(),
  withTiming: jest.fn(),
  withSpring: jest.fn(),
  runOnJS: jest.fn((cb) => cb),
  runOnUI: jest.fn((cb) => cb),
  default: {
    createAnimatedComponent: jest.fn(component => component),
  },
}));

// ============================================================================
// Safe Area Context Mock
// ============================================================================
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  })),
  useSafeAreaFrame: jest.fn(() => ({
    x: 0,
    y: 0,
    width: 390,
    height: 844,
  })),
}));

// ============================================================================
// React Native Screens Mock
// ============================================================================
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  enableFreeze: jest.fn(),
  Screen: 'Screen',
  NativeScreen: 'NativeScreen',
  ScreenContainer: 'ScreenContainer',
}));

// ============================================================================
// React Native SVG Mock
// ============================================================================
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'SVG',
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Line: 'Line',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Rect: 'Rect',
  Text: 'Text',
  TSpan: 'TSpan',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  Stop: 'Stop',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  ClipPath: 'ClipPath',
  Mask: 'Mask',
}));

// ============================================================================
// React Native Toast Message Mock
// ============================================================================
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: 'ToastMessage',
  show: jest.fn(),
  hide: jest.fn(),
  Toast: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

// ============================================================================
// Lucide React Native Mock
// ============================================================================
jest.mock('lucide-react-native', () => {
  const mockIcon = 'Icon';
  return {
    AlertTriangle: mockIcon,
    Archive: mockIcon,
    ArrowLeft: mockIcon,
    ArrowRight: mockIcon,
    Bell: mockIcon,
    Briefcase: mockIcon,
    Calendar: mockIcon,
    Check: mockIcon,
    ChevronDown: mockIcon,
    ChevronRight: mockIcon,
    Clock: mockIcon,
    Copy: mockIcon,
    Cpu: mockIcon,
    CreditCard: mockIcon,
    Database: mockIcon,
    Download: mockIcon,
    Edit: mockIcon,
    Eye: mockIcon,
    EyeOff: mockIcon,
    File: mockIcon,
    FileText: mockIcon,
    Filter: mockIcon,
    Flag: mockIcon,
    Folder: mockIcon,
    Grid: mockIcon,
    LayoutGrid: mockIcon,
    Help: mockIcon,
    Home: mockIcon,
    Info: mockIcon,
    Key: mockIcon,
    Link: mockIcon,
    Lock: mockIcon,
    LogOut: mockIcon,
    Mail: mockIcon,
    MoreVertical: mockIcon,
    MessageSquare: mockIcon,
    MessageCirclePlus: mockIcon,
    CheckCircle: mockIcon,
    Pin: mockIcon,
    Minus: mockIcon,
    Moon: mockIcon,
    Palette: mockIcon,
    Phone: mockIcon,
    Plus: mockIcon,
    RefreshCw: mockIcon,
    Search: mockIcon,
    Send: mockIcon,
    Settings: mockIcon,
    Share2: mockIcon,
    Shield: mockIcon,
    ShoppingCart: mockIcon,
    Smartphone: mockIcon,
    Star: mockIcon,
    Sun: mockIcon,
    Trash2: mockIcon,
    TrendingUp: mockIcon,
    Upload: mockIcon,
    User: mockIcon,
    Users: mockIcon,
    Volume2: mockIcon,
    Wallet: mockIcon,
    Wifi: mockIcon,
    X: mockIcon,
    Zap: mockIcon,
  };
});

// ============================================================================
// Async Storage (Alternative Mock - backup)
// ============================================================================
const mockAsyncStorage = {
  setItem: jest.fn(async () => null),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
  clear: jest.fn(async () => null),
};

global.AsyncStorage = mockAsyncStorage;

// ============================================================================
// Suppress Console Warnings (Optional)
// ============================================================================
global.console.warn = jest.fn();
global.console.error = jest.fn();

// ============================================================================
// Setup Global Variables
// ============================================================================
global.__DEV__ = true;
global.process.env.NODE_ENV = 'test';
global.process.env.DEVELOPER_BYPASS = 'false';

// Increase timeout for all tests
jest.setTimeout(30000);
