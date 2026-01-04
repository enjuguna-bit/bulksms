// Mock for @notifee/react-native
const notifee = {
    createChannel: jest.fn(() => Promise.resolve()),
    displayNotification: jest.fn(() => Promise.resolve()),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    cancelNotification: jest.fn(() => Promise.resolve()),
    getDisplayedNotifications: jest.fn(() => Promise.resolve([])),
    setBadgeCount: jest.fn(() => Promise.resolve()),
    incrementBadgeCount: jest.fn(() => Promise.resolve()),
    requestPermission: jest.fn(() => Promise.resolve({
        authorizationStatus: 2, // Authorized
    })),
    onForegroundEvent: jest.fn(() => ({ remove: jest.fn() })),
    onBackgroundEvent: jest.fn(() => Promise.resolve()),
    registerHeadlessTask: jest.fn(() => { }),
};

const AndroidImportance = {
    DEFAULT: 3,
    HIGH: 4,
    LOW: 2,
    MIN: 1,
    NONE: 0,
};

const EventType = {
    DELIVERED: 1,
    PRESS: 2,
    DISMISSED: 3,
    ACTION_PRESS: 4,
    APP_BLOCKED: 5,
    CHANNEL_BLOCKED: 6,
    CHANNEL_GROUP_BLOCKED: 7,
    TRIGGER_NOTIFICATION: 8,
    UNKNOWN: 0,
};

module.exports = {
    __esModule: true,
    default: notifee,
    AndroidImportance,
    EventType,
};
