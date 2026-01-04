import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
    enabled: boolean;
    showPreview: boolean;
    vibrate: boolean;
    sound: boolean;
    silentHours: {
        enabled: boolean;
        startHour: number; // 0-23
        endHour: number; // 0-23
    };
    doNotDisturb: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    showPreview: true,
    vibrate: true,
    sound: true,
    silentHours: {
        enabled: false,
        startHour: 22, // 10 PM
        endHour: 7,    // 7 AM
    },
    doNotDisturb: false,
};

const SETTINGS_KEY = '@notification_settings';

class NotificationPreferencesService {
    private settings: NotificationSettings = DEFAULT_SETTINGS;
    private loaded = false;

    async load(): Promise<NotificationSettings> {
        if (this.loaded) {
            return this.settings;
        }

        try {
            const stored = await AsyncStorage.getItem(SETTINGS_KEY);
            if (stored) {
                this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
            this.loaded = true;
        } catch (error) {
            console.error('[NotificationPreferences] Failed to load settings:', error);
        }
        return this.settings;
    }

    async save(settings: Partial<NotificationSettings>): Promise<void> {
        this.settings = { ...this.settings, ...settings };
        try {
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (error) {
            console.error('[NotificationPreferences] Failed to save settings:', error);
        }
    }

    shouldNotify(): boolean {
        if (!this.settings.enabled || this.settings.doNotDisturb) {
            return false;
        }

        // Check silent hours
        if (this.settings.silentHours.enabled) {
            const now = new Date();
            const hour = now.getHours();
            const { startHour, endHour } = this.settings.silentHours;

            if (startHour < endHour) {
                // Same day range: 9 AM - 5 PM
                if (hour >= startHour && hour < endHour) {
                    return false;
                }
            } else {
                // Overnight range: 10 PM - 7 AM
                if (hour >= startHour || hour < endHour) {
                    return false;
                }
            }
        }

        return true;
    }

    get(): NotificationSettings {
        return { ...this.settings };
    }

    async reset(): Promise<void> {
        this.settings = DEFAULT_SETTINGS;
        await AsyncStorage.removeItem(SETTINGS_KEY);
    }
}

export const notificationPreferences = new NotificationPreferencesService();
export default notificationPreferences;
