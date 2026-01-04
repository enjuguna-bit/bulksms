// ============================================================
// useWeather.ts - Real weather data hook with location
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { fetchWeather, WeatherData, getWeatherEmoji } from '@/services/weatherService';

interface UseWeatherResult {
    weather: WeatherData | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    displayText: string;
    emoji: string;
}

async function requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'BulkSMS needs access to your location to show local weather.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('Location permission error:', err);
            return false;
        }
    }
    return true; // iOS handles differently
}

function getCurrentPosition(): Promise<{ lat: number; lon: number } | null> {
    return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
            },
            (error) => {
                console.warn('Geolocation error:', error.message);
                resolve(null); // Fall back to default location
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes cache
            }
        );
    });
}

export function useWeather(): UseWeatherResult {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWeatherData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Request location permission
            const hasPermission = await requestLocationPermission();

            let lat: number | undefined;
            let lon: number | undefined;

            if (hasPermission) {
                const position = await getCurrentPosition();
                if (position) {
                    lat = position.lat;
                    lon = position.lon;
                }
            }

            // Fetch weather (will use Nairobi fallback if no location)
            const data = await fetchWeather(lat, lon);
            setWeather(data);
        } catch (e: any) {
            console.error('Weather fetch error:', e);
            setError(e.message || 'Failed to fetch weather');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWeatherData();
    }, [fetchWeatherData]);

    const displayText = weather
        ? `${weather.city}: ${weather.temperature}°C, ${weather.condition}`
        : loading
            ? 'Loading weather...'
            : 'Weather unavailable';

    const emoji = weather ? getWeatherEmoji(weather.condition) : '🌡️';

    return {
        weather,
        loading,
        error,
        refresh: fetchWeatherData,
        displayText,
        emoji,
    };
}
