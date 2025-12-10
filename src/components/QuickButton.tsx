import React, { memo } from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Animated, Platform } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { useEffect, useRef } from "react";
import { haptics } from "@/utils/haptics";

interface QuickButtonProps {
    icon: React.ReactNode;
    label: string;
    color: string;
    onPress: () => void;
    style?: ViewStyle;
    gradient?: string[];
    haptic?: boolean;
    hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';
}

export const QuickButton = memo(function QuickButton({
    icon,
    label,
    color,
    onPress,
    style,
    gradient,
    haptic = true,
    hapticType = 'light',
}: QuickButtonProps) {
    const { colors } = useThemeSettings();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shadowAnim = useRef(new Animated.Value(0)).current;

    const triggerHaptic = () => {
        if (haptic) {
            try {
                switch (hapticType) {
                    case 'light':
                        haptics.light();
                        break;
                    case 'medium':
                        haptics.medium();
                        break;
                    case 'heavy':
                        haptics.heavy();
                        break;
                    case 'success':
                        haptics.success();
                        break;
                    case 'warning':
                        haptics.warning();
                        break;
                    case 'error':
                        haptics.error();
                        break;
                    case 'selection':
                        haptics.selection();
                        break;
                    default:
                        haptics.light();
                }
            } catch (error) {
                console.warn('Haptic feedback failed:', error);
            }
        }
    };

    const handlePressIn = () => {
        triggerHaptic();
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const buttonContent = (
        <>
            {icon}
            <Text style={styles.quickLabel}>{label}</Text>
        </>
    );

    const animatedStyle = {
        transform: [{ scale: scaleAnim }],
        shadowOpacity: shadowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.15, 0.05],
        }),
        shadowRadius: shadowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [6, 2],
        }),
        shadowOffset: {
            width: 0,
            height: shadowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 1],
            }),
        },
    };

    if (gradient) {
        try {
            // Try to import LinearGradient dynamically
            const LinearGradient = require("expo-linear-gradient").LinearGradient;
            
            return (
                <Animated.View style={[styles.buttonContainer, animatedStyle, style]}>
                    <TouchableOpacity
                        onPress={onPress}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={0.9}
                        style={styles.touchable}
                    >
                        <LinearGradient
                            colors={gradient as [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.quickButton}
                        >
                            {buttonContent}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            );
        } catch (error) {
            // Fallback to solid background if LinearGradient is not available
            return (
                <Animated.View style={[styles.buttonContainer, animatedStyle, style]}>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: gradient[0] || color }]}
                        onPress={onPress}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={0.9}
                    >
                        {buttonContent}
                    </TouchableOpacity>
                </Animated.View>
            );
        }
    }

    return (
        <Animated.View style={[styles.buttonContainer, animatedStyle, style]}>
            <TouchableOpacity
                style={[styles.quickButton, { backgroundColor: color }]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                {buttonContent}
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    buttonContainer: {
        flex: 1,
    },
    touchable: {
        flex: 1,
    },
    quickButton: {
        flex: 1,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    quickLabel: {
        color: "#fff",
        fontWeight: "700",
        marginTop: 6,
        fontSize: 14,
    },
});
