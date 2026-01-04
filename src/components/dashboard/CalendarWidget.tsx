// ============================================================
// CalendarWidget.tsx - Real calendar events widget
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarDays, CalendarCheck, AlertCircle } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';

interface CalendarWidgetProps {
    compact?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ compact = true }) => {
    const {
        events,
        loading,
        hasPermission,
        nextEventText,
        upcomingHoliday,
        refresh
    } = useCalendarEvents();

    if (compact) {
        return (
            <TouchableOpacity style={styles.miniWidget} onPress={refresh} activeOpacity={0.7}>
                <View style={styles.header}>
                    <CalendarDays size={16} color={kenyaColors.safaricomRed} />
                    <Text style={styles.title}> Events</Text>
                </View>
                <Text style={styles.content} numberOfLines={2}>
                    {nextEventText}
                </Text>
                {upcomingHoliday && !loading && (
                    <Text style={styles.holidayHint}>🇰🇪 {upcomingHoliday}</Text>
                )}
            </TouchableOpacity>
        );
    }

    // Full widget version
    return (
        <View style={styles.fullWidget}>
            <View style={styles.fullHeader}>
                <CalendarCheck size={20} color={kenyaColors.safaricomGreen} />
                <Text style={styles.fullTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={refresh}>
                    <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {!hasPermission && (
                <View style={styles.permissionBanner}>
                    <AlertCircle size={16} color={kenyaColors.statOrange} />
                    <Text style={styles.permissionText}>
                        Grant calendar access to see your events
                    </Text>
                </View>
            )}

            {loading ? (
                <Text style={styles.loadingText}>Loading events...</Text>
            ) : events.length > 0 ? (
                events.slice(0, 5).map((event) => (
                    <View key={event.id} style={styles.eventItem}>
                        <View style={styles.eventDot} />
                        <View style={styles.eventContent}>
                            <Text style={styles.eventTitle} numberOfLines={1}>
                                {event.title}
                            </Text>
                            <Text style={styles.eventDate}>
                                {event.startDate.toLocaleDateString('en-KE', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: event.isAllDay ? undefined : '2-digit',
                                    minute: event.isAllDay ? undefined : '2-digit',
                                })}
                            </Text>
                        </View>
                    </View>
                ))
            ) : (
                <Text style={styles.emptyText}>
                    {upcomingHoliday ? `🇰🇪 ${upcomingHoliday}` : 'No upcoming events'}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Compact mini widget styles
    miniWidget: {
        flex: 1,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: kenyaColors.safaricomRed,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 12,
        fontWeight: '700',
        color: '#555',
    },
    content: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        lineHeight: 18,
    },
    holidayHint: {
        fontSize: 11,
        color: kenyaColors.safaricomGreen,
        marginTop: 4,
        fontWeight: '500',
    },

    // Full widget styles
    fullWidget: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
    },
    fullHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    fullTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    refreshText: {
        fontSize: 12,
        color: kenyaColors.importBlue,
        fontWeight: '600',
    },
    permissionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    permissionText: {
        flex: 1,
        fontSize: 12,
        color: '#E65100',
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingVertical: 12,
    },
    eventItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    eventDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: kenyaColors.safaricomGreen,
        marginTop: 5,
        marginRight: 10,
    },
    eventContent: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    eventDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
});
