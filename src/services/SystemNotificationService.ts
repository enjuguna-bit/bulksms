import notifee, { AndroidImportance, EventType, Event } from '@notifee/react-native';
import { AppState } from 'react-native';
import type { Message } from '@/db/messaging';

export interface SystemNotificationData {
    conversationId: number;
    address: string;
    displayName?: string;
    message: Message;
    count: number;
}

class SystemNotificationService {
    private channelId = 'sms-messages';
    private overlayChannelId = 'sms-overlay';
    private initialized = false;
    private navigationHandler: ((conversationId: number, address: string) => void) | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Create standard Android notification channel
            await notifee.createChannel({
                id: this.channelId,
                name: 'SMS Messages',
                description: 'New SMS message notifications',
                importance: AndroidImportance.HIGH,
                sound: 'default',
                vibration: true,
                lights: true,
                lightColor: '#43B02A', // Safaricom green
            });

            // Create overlay notification channel for heads-up notifications
            await notifee.createChannel({
                id: this.overlayChannelId,
                name: 'SMS Overlay',
                description: 'Overlay notifications for incoming SMS',
                importance: AndroidImportance.HIGH, // HIGH importance for heads-up overlay notifications
                sound: 'default',
                vibration: true,
                lights: true,
                lightColor: '#43B02A',
                bypassDnd: true, // Bypass Do Not Disturb
            });

            // Handle notification events (foreground & background)
            notifee.onForegroundEvent(this.handleNotificationEvent);
            notifee.onBackgroundEvent(this.handleNotificationEvent);

            this.initialized = true;
            console.log('[SystemNotificationService] Initialized successfully');
        } catch (error) {
            console.error('[SystemNotificationService] Initialization failed:', error);
        }
    }

    setNavigationHandler(handler: (conversationId: number, address: string) => void): void {
        this.navigationHandler = handler;
    }

    private handleNotificationEvent = async ({ type, detail }: Event): Promise<void> => {
        if (type === EventType.PRESS && detail.notification) {
            const { conversationId, address } = detail.notification.data || {};

            if (conversationId && address && this.navigationHandler) {
                this.navigationHandler(Number(conversationId), String(address));
            }
        }
    };

    async showNotification(data: SystemNotificationData): Promise<void> {
        // Only show if app is backgrounded
        if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') {
            return;
        }

        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const senderName = data.displayName || data.address;
            const messageBody = data.message.body || '';
            const body = data.count > 1
                ? `${data.count} new messages`
                : messageBody.substring(0, 100);

            await notifee.displayNotification({
                title: senderName,
                body,
                android: {
                    channelId: this.channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    smallIcon: 'ic_notification',
                    color: '#43B02A', // Safaricom green
                    showTimestamp: true,
                    timestamp: data.message.timestamp || Date.now(),
                },
                ios: {
                    sound: 'default',
                    categoryId: 'message',
                    foregroundPresentationOptions: {
                        alert: true,
                        sound: true,
                        badge: true,
                    },
                },
                data: {
                    conversationId: data.conversationId.toString(),
                    address: data.address,
                },
            });

            console.log('[SystemNotificationService] Notification displayed for:', senderName);
        } catch (error) {
            console.error('[SystemNotificationService] Failed to display notification:', error);
        }
    }

    /**
     * Show overlay notification that appears over other apps (heads-up style)
     * This displays even when the app is in foreground
     */
    async showOverlayNotification(data: SystemNotificationData): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const senderName = data.displayName || data.address;
            const messageBody = data.message.body || '';
            const body = data.count > 1
                ? `${data.count} new messages`
                : messageBody.substring(0, 100);

            await notifee.displayNotification({
                title: `📱 ${senderName}`,
                body,
                android: {
                    channelId: this.overlayChannelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    smallIcon: 'ic_notification',
                    color: '#43B02A',
                    showTimestamp: true,
                    timestamp: data.message.timestamp || Date.now(),
                    // Heads-up notification settings
                    ongoing: false,
                    autoCancel: true,
                    onlyAlertOnce: false,
                    // Full screen intent for maximum visibility
                    fullScreenAction: {
                        id: 'fullscreen',
                        launchActivity: 'default',
                    },
                },
                ios: {
                    sound: 'default',
                    categoryId: 'message',
                    foregroundPresentationOptions: {
                        alert: true,
                        sound: true,
                        badge: true,
                    },
                },
                data: {
                    conversationId: data.conversationId.toString(),
                    address: data.address,
                    overlay: 'true',
                },
            });

            console.log('[SystemNotificationService] Overlay notification displayed for:', senderName);
        } catch (error) {
            console.error('[SystemNotificationService] Failed to display overlay notification:', error);
        }
    }

    async cancelAll(): Promise<void> {
        try {
            await notifee.cancelAllNotifications();
        } catch (error) {
            console.error('[SystemNotificationService] Failed to cancel notifications:', error);
        }
    }

    async cancelForConversation(conversationId: number): Promise<void> {
        try {
            const notifications = await notifee.getDisplayedNotifications();
            const toCancel = notifications.filter(
                n => n.notification.data?.conversationId === conversationId.toString()
            );

            await Promise.all(
                toCancel.map(n => n.id ? notifee.cancelNotification(n.id) : Promise.resolve())
            );
        } catch (error) {
            console.error('[SystemNotificationService] Failed to cancel conversation notifications:', error);
        }
    }

    async setBadgeCount(count: number): Promise<void> {
        try {
            await notifee.setBadgeCount(count);
        } catch (error) {
            console.error('[SystemNotificationService] Failed to set badge count:', error);
        }
    }

    async incrementBadgeCount(): Promise<void> {
        try {
            await notifee.incrementBadgeCount();
        } catch (error) {
            console.error('[SystemNotificationService] Failed to increment badge count:', error);
        }
    }

    async requestPermission(): Promise<boolean> {
        try {
            const settings = await notifee.requestPermission();
            return settings.authorizationStatus >= 1; // Authorized or provisional
        } catch (error) {
            console.error('[SystemNotificationService] Failed to request permission:', error);
            return false;
        }
    }
}

export const systemNotificationService = new SystemNotificationService();
export default systemNotificationService;
