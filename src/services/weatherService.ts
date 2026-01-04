// ============================================================
// weatherService.ts - OpenWeatherMap Integration for Kenya
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE: Replace with a valid OpenWeatherMap API key from https://openweathermap.org/api
// The API key should be 32 hex characters. Set to empty to disable weather feature.
const API_KEY: string = ''; // Disabled - invalid key was causing 401 errors
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export interface WeatherData {
    temperature: number;
    condition: string;
    description: string;
    icon: string;
    city: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
}

interface CachedWeather {
    data: WeatherData;
    timestamp: number;
    lat: number;
    lon: number;
}

// Kenyan city coordinates fallbacks
const KENYA_CITIES = {
    nairobi: { lat: -1.2921, lon: 36.8219 },
    mombasa: { lat: -4.0435, lon: 39.6682 },
    kisumu: { lat: -0.0917, lon: 34.7680 },
    nakuru: { lat: -0.3031, lon: 36.0800 },
    eldoret: { lat: 0.5143, lon: 35.2698 },
};

function mapWeatherCondition(main: string): string {
    const conditions: Record<string, string> = {
        'Clear': 'Sunny',
        'Clouds': 'Cloudy',
        'Rain': 'Rainy',
        'Drizzle': 'Light Rain',
        'Thunderstorm': 'Stormy',
        'Snow': 'Snowy',
        'Mist': 'Misty',
        'Fog': 'Foggy',
        'Haze': 'Hazy',
        'Dust': 'Dusty',
        'Smoke': 'Smoky',
    };
    return conditions[main] || main;
}

function kelvinToCelsius(kelvin: number): number {
    return Math.round(kelvin - 273.15);
}

async function getCachedWeather(lat: number, lon: number): Promise<WeatherData | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed: CachedWeather = JSON.parse(cached);
            const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
            const isSameLocation = Math.abs(parsed.lat - lat) < 0.1 && Math.abs(parsed.lon - lon) < 0.1;

            if (!isExpired && isSameLocation) {
                return parsed.data;
            }
        }
    } catch (e) {
        console.warn('Failed to read weather cache:', e);
    }
    return null;
}

async function setCachedWeather(data: WeatherData, lat: number, lon: number): Promise<void> {
    try {
        const cache: CachedWeather = {
            data,
            timestamp: Date.now(),
            lat,
            lon,
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to cache weather:', e);
    }
}

export async function fetchWeather(
    lat?: number,
    lon?: number
): Promise<WeatherData> {
    // Default to Nairobi if no location provided
    const finalLat = lat ?? KENYA_CITIES.nairobi.lat;
    const finalLon = lon ?? KENYA_CITIES.nairobi.lon;

    // If no API key configured, return fallback data silently
    if (!API_KEY || API_KEY.length < 32) {
        return getFallbackWeather();
    }

    // Check cache first
    const cached = await getCachedWeather(finalLat, finalLon);
    if (cached) {
        return cached;
    }

    try {
        const url = `${BASE_URL}?lat=${finalLat}&lon=${finalLon}&appid=${API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Weather API error: ${response.status}`);
            return getFallbackWeather();
        }

        const data = await response.json();

        const weatherData: WeatherData = {
            temperature: kelvinToCelsius(data.main.temp),
            feelsLike: kelvinToCelsius(data.main.feels_like),
            condition: mapWeatherCondition(data.weather[0].main),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            city: data.name || 'Unknown',
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        };

        // Cache the result
        await setCachedWeather(weatherData, finalLat, finalLon);

        return weatherData;
    } catch (error) {
        // Silently return fallback - don't log errors for missing API key
        return getFallbackWeather();
    }
}

/**
 * Returns fallback weather data when API is unavailable
 */
function getFallbackWeather(): WeatherData {
    return {
        temperature: 24,
        feelsLike: 24,
        condition: 'Sunny',
        description: 'Weather data unavailable',
        icon: '01d',
        city: 'Nairobi',
        humidity: 65,
        windSpeed: 12,
    };
}

export function getWeatherEmoji(condition: string): string {
    const emojis: Record<string, string> = {
        'Sunny': '☀️',
        'Clear': '☀️',
        'Cloudy': '☁️',
        'Partly Cloudy': '⛅',
        'Rainy': '🌧️',
        'Light Rain': '🌦️',
        'Stormy': '⛈️',
        'Thunderstorm': '⛈️',
        'Snowy': '❄️',
        'Misty': '🌫️',
        'Foggy': '🌫️',
        'Hazy': '🌫️',
        'Dusty': '💨',
        'Smoky': '💨',
    };
    return emojis[condition] || '🌡️';
}
