// ============================================================
// WeatherWidget.tsx - Real weather data widget
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Cloud, Sun, CloudRain, CloudLightning, CloudSnow, Wind, Droplets } from 'lucide-react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import { useWeather } from '@/hooks/useWeather';

interface WeatherWidgetProps {
    compact?: boolean;
}

const getWeatherIcon = (condition: string, size: number = 16) => {
    const iconProps = { size, color: kenyaColors.importBlue };

    switch (condition.toLowerCase()) {
        case 'sunny':
        case 'clear':
            return <Sun {...iconProps} color="#FFA000" />;
        case 'rainy':
        case 'light rain':
            return <CloudRain {...iconProps} />;
        case 'stormy':
        case 'thunderstorm':
            return <CloudLightning {...iconProps} color="#5C6BC0" />;
        case 'snowy':
            return <CloudSnow {...iconProps} />;
        case 'cloudy':
        case 'partly cloudy':
            return <Cloud {...iconProps} />;
        case 'dusty':
        case 'windy':
            return <Wind {...iconProps} />;
        default:
            return <Cloud {...iconProps} />;
    }
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ compact = true }) => {
    const { weather, loading, error, refresh, displayText, emoji } = useWeather();

    if (compact) {
        return (
            <TouchableOpacity style={styles.miniWidget} onPress={refresh} activeOpacity={0.7}>
                <View style={styles.header}>
                    {loading ? (
                        <ActivityIndicator size="small" color={kenyaColors.importBlue} />
                    ) : (
                        getWeatherIcon(weather?.condition || 'cloudy')
                    )}
                    <Text style={styles.title}> Weather</Text>
                </View>
                <Text style={styles.content} numberOfLines={1}>
                    {displayText}
                </Text>
                {weather && !loading && (
                    <View style={styles.detailsRow}>
                        <Droplets size={12} color="#666" />
                        <Text style={styles.detailText}>{weather.humidity}%</Text>
                        <Wind size={12} color="#666" style={{ marginLeft: 8 }} />
                        <Text style={styles.detailText}>{weather.windSpeed} km/h</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    // Full widget version
    return (
        <View style={styles.fullWidget}>
            <View style={styles.fullHeader}>
                {loading ? (
                    <ActivityIndicator size={24} color={kenyaColors.importBlue} />
                ) : (
                    getWeatherIcon(weather?.condition || 'cloudy', 24)
                )}
                <Text style={styles.fullTitle}>Current Weather</Text>
                <TouchableOpacity onPress={refresh}>
                    <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={kenyaColors.importBlue} />
                    <Text style={styles.loadingText}>Fetching weather...</Text>
                </View>
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : weather ? (
                <View style={styles.weatherContent}>
                    <View style={styles.mainTemp}>
                        <Text style={styles.temperature}>{weather.temperature}°</Text>
                        <View style={styles.conditionContainer}>
                            <Text style={styles.condition}>{weather.condition}</Text>
                            <Text style={styles.city}>{weather.city}</Text>
                        </View>
                    </View>

                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Feels Like</Text>
                            <Text style={styles.detailValue}>{weather.feelsLike}°C</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Humidity</Text>
                            <Text style={styles.detailValue}>{weather.humidity}%</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Wind</Text>
                            <Text style={styles.detailValue}>{weather.windSpeed} km/h</Text>
                        </View>
                    </View>
                </View>
            ) : null}
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
        borderLeftColor: kenyaColors.importBlue,
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
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    detailText: {
        fontSize: 11,
        color: '#666',
        marginLeft: 4,
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
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    errorText: {
        fontSize: 14,
        color: kenyaColors.statRed,
        textAlign: 'center',
    },
    weatherContent: {
        paddingTop: 8,
    },
    mainTemp: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    temperature: {
        fontSize: 48,
        fontWeight: '800',
        color: '#333',
    },
    conditionContainer: {
        marginLeft: 16,
    },
    condition: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    city: {
        fontSize: 14,
        color: '#666',
    },
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
});
