import { Vibration } from 'react-native';
import type { Message } from '@/db/messaging';
import { notificationPreferences } from './NotificationPreferences';

export interface LocalNotificationData {
    conversationId: number;
    address: string;
    displayName?: string;
    message: Message;
    count: number;
}

type ToastFunction = (config: {
    type: 'info' | 'success' | 'error';
    text1: string;
    text2?: string;
    position?: 'top' | 'bottom';
    visibilityTime?: number;
    onPress?: () => void;
}) => void;

export class LocalNotificationService {
    private currentScreen: string = '';
    private toast: ToastFunction | null = null;
    private navigation: any = null;

    setToast(toast: ToastFunction): void {
        this.toast = toast;
    }

    setNavigation(navigation: any): void {
        this.navigation = navigation;
    }

    setCurrentScreen(screenName: string): void {
        this.currentScreen = screenName;
    }

    async showInAppNotification(data: LocalNotificationData): Promise<void> {
        const settings = notificationPreferences.get();

        // Don't show if notifications disabled
        if (!settings.enabled) {
            return;
        }

        // Don't show if already on the conversation screen
        if (this.currentScreen === `Conversation-${data.conversationId}`) {
            return;
        }

        if (!this.toast) {
            console.warn('[LocalNotificationService] Toast not initialized');
            return;
        }

        const senderName = data.displayName || data.address;
        const messageBody = data.message.body || '';
        const preview = settings.showPreview
            ? messageBody.substring(0, 50) + (messageBody.length > 50 ? '...' : '')
            : data.count > 1
                ? `${data.count} new messages`
                : 'New message';

        this.toast({
            type: 'info',
            text1: senderName,
            text2: preview,
            position: 'top',
            visibilityTime: 5000,
            onPress: () => {
                if (this.navigation) {
                    this.navigation.navigate('Conversation', {
                        conversationId: data.conversationId,
                        address: data.address,
                    });
                }
            },
        });

        // Vibration if enabled
        if (settings.vibrate) {
            Vibration.vibrate(200);
        }
    }

    clear(): void {
        this.toast = null;
        this.navigation = null;
        this.currentScreen = '';
    }
}

export const localNotificationService = new LocalNotificationService();
export default localNotificationService;
