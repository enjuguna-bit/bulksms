// ============================================================
// useCalendarEvents.ts - Real calendar events from device
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import RNCalendarEvents, { CalendarEventReadable } from 'react-native-calendar-events';

// Kenyan Public Holidays 2024-2025
const KENYA_HOLIDAYS: Record<string, string> = {
    '01-01': 'New Year\'s Day',
    '04-18': 'Good Friday',
    '04-21': 'Easter Monday',
    '05-01': 'Labour Day',
    '06-01': 'Madaraka Day',
    '10-10': 'Huduma Day',
    '10-20': 'Mashujaa Day',
    '12-12': 'Jamhuri Day',
    '12-25': 'Christmas Day',
    '12-26': 'Boxing Day',
};

export interface CalendarEvent {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    isHoliday: boolean;
    isAllDay: boolean;
}

interface UseCalendarResult {
    events: CalendarEvent[];
    loading: boolean;
    error: string | null;
    hasPermission: boolean;
    refresh: () => Promise<void>;
    nextEventText: string;
    upcomingHoliday: string | null;
}

function getUpcomingKenyanHoliday(): { name: string; daysUntil: number } | null {
    const today = new Date();
    const year = today.getFullYear();

    // Check this year and next year
    const holidayDates: Array<{ date: Date; name: string }> = [];

    [year, year + 1].forEach(y => {
        Object.entries(KENYA_HOLIDAYS).forEach(([mmdd, name]) => {
            const [month, day] = mmdd.split('-').map(Number);
            holidayDates.push({
                date: new Date(y, month - 1, day),
                name,
            });
        });
    });

    // Find next upcoming holiday
    const upcoming = holidayDates
        .filter(h => h.date > today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    if (upcoming) {
        const daysUntil = Math.ceil(
            (upcoming.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { name: upcoming.name, daysUntil };
    }

    return null;
}

function formatEventDate(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
        return `Today at ${date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isTomorrow) {
        return `Tomorrow at ${date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
    }

    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) {
        return `in ${daysUntil} days`;
    }

    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

async function requestCalendarPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
                {
                    title: 'Calendar Permission',
                    message: 'BulkSMS needs access to your calendar to show upcoming events.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('Calendar permission error:', err);
            return false;
        }
    }

    // iOS
    const status = await RNCalendarEvents.requestPermissions();
    return status === 'authorized';
}

export function useCalendarEvents(): UseCalendarResult {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState(false);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Request permission
            const granted = await requestCalendarPermission();
            setHasPermission(granted);

            if (!granted) {
                setEvents([]);
                setLoading(false);
                return;
            }

            // Get events for next 30 days
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            const calendarEvents = await RNCalendarEvents.fetchAllEvents(
                startDate.toISOString(),
                endDate.toISOString()
            );

            // Map to our format
            const mappedEvents: CalendarEvent[] = calendarEvents
                .filter((event: CalendarEventReadable) => !!event.startDate)
                .map((event: CalendarEventReadable) => ({
                    id: event.id,
                    title: event.title || 'Untitled Event',
                    startDate: new Date(event.startDate!),
                    endDate: new Date(event.endDate || event.startDate!),
                    isHoliday: false,
                    isAllDay: event.allDay || false,
                }))
                .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                .slice(0, 10); // Limit to 10 events

            setEvents(mappedEvents);
        } catch (e: any) {
            console.error('Calendar fetch error:', e);
            setError(e.message || 'Failed to fetch calendar');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Get upcoming Kenyan holiday
    const holiday = getUpcomingKenyanHoliday();
    const upcomingHoliday = holiday
        ? `${holiday.name} in ${holiday.daysUntil} ${holiday.daysUntil === 1 ? 'day' : 'days'}`
        : null;

    // Generate display text
    let nextEventText: string;

    if (loading) {
        nextEventText = 'Loading events...';
    } else if (!hasPermission) {
        nextEventText = upcomingHoliday || 'Grant calendar access';
    } else if (events.length > 0) {
        const next = events[0];
        nextEventText = `${next.title} - ${formatEventDate(next.startDate)}`;
    } else {
        nextEventText = upcomingHoliday || 'No upcoming events';
    }

    return {
        events,
        loading,
        error,
        hasPermission,
        refresh: fetchEvents,
        nextEventText,
        upcomingHoliday,
    };
}
