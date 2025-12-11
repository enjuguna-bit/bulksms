import React, { memo } from "react";
import { View, Text, StyleSheet, ViewStyle, Animated } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { useEffect, useRef } from "react";

// Fallback component for when LinearGradient is not available
const GradientFallback: React.FC<{ children: React.ReactNode; colors?: string[]; style?: ViewStyle }> = ({ 
    children, 
    colors, 
    style 
}) => {
    const { colors: themeColors } = useThemeSettings();
    
    // Use first gradient color or primary600 theme color as fallback
    const fallbackColor = colors?.[0] || themeColors.primary600;
    
    return (
        <View style={[{ backgroundColor: fallbackColor }, style]}>
            {children}
        </View>
    );
};

interface StatCardProps {
    label: string;
    value: number;
    color: string;
    style?: ViewStyle;
    gradient?: string[];
    animated?: boolean;
}

export const StatCard = memo(function StatCard({
    label,
    value,
    color,
    style,
    gradient,
    animated = true,
}: StatCardProps) {
    const { colors } = useThemeSettings();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (animated) {
            const staggeredDelay = Math.random() * 300;
            
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    delay: staggeredDelay,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    delay: staggeredDelay,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(1);
            scaleAnim.setValue(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animated]);

    const cardContent = (
        <View style={[styles.statCard, { borderLeftColor: color }, style]}>
            <Text style={[styles.statValue, { color: gradient ? '#ffffff' : colors.text }]}>
                {value.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: gradient ? '#ffffff' : colors.subText }]}>
                {label}
            </Text>
        </View>
    );

    if (gradient) {
        try {
            // Try to import LinearGradient dynamically
            const LinearGradient = require("expo-linear-gradient").LinearGradient;
            
            return (
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }}
                >
                    <LinearGradient
                        colors={gradient as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[{
                            borderRadius: 12,
                            ...colors.shadow.md,
                        }, style]}
                    >
                        {cardContent}
                    </LinearGradient>
                </Animated.View>
            );
        } catch (error) {
            // Fallback to solid background if LinearGradient is not available
            return (
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }}
                >
                    <GradientFallback
                        colors={gradient}
                        style={{
                            borderRadius: 12,
                            backgroundColor: gradient[0],
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                            ...style,
                        }}
                    >
                        {cardContent}
                    </GradientFallback>
                </Animated.View>
            );
        }
    }

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
            }}
        >
            {cardContent}
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderLeftWidth: 5,
        borderColor: "#e2e8f0",
        elevation: 1,
        // Shadow for iOS
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    statLabel: {
        color: "#475569",
        fontWeight: "600",
        fontSize: 12,
        marginTop: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: "900",
        color: "#0f172a",
    },
});
