import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Pressable } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'pressable';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: string[];
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default',
  shadow = 'md',
  gradient,
  onPress,
  onLongPress,
  disabled = false,
}) => {
  const { colors } = useThemeSettings();

  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 16,
      padding: 16,
      ...colors.shadow[shadow],
    };

    if (gradient) {
      return {
        ...base,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      };
    }

    const nonGradientBase = {
      ...base,
      backgroundColor: colors.card,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...nonGradientBase,
          ...colors.shadow.lg,
        };
      case 'outlined':
        return {
          ...nonGradientBase,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'pressable':
        return {
          ...nonGradientBase,
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return nonGradientBase;
    }
  };

  const cardContent = (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );

  if (gradient) {
    const gradientColors = gradient;
    
    try {
      // Try to import LinearGradient dynamically
      const LinearGradient = require("expo-linear-gradient").LinearGradient;
      
      const gradientCard = (
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[getCardStyle(), style]}
        >
          {children}
        </LinearGradient>
      );

      if (onPress) {
        return (
          <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            {gradientCard}
          </TouchableOpacity>
        );
      }
      return gradientCard;
    } catch (error) {
      // Fallback to solid background if LinearGradient is not available
      const fallbackCard = (
        <View style={[getCardStyle(), { backgroundColor: gradientColors[0] }, style]}>
          {children}
        </View>
      );

      if (onPress) {
        return (
          <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            {fallbackCard}
          </TouchableOpacity>
        );
      }
      return fallbackCard;
    }
  }

  if (variant === 'pressable' || onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={disabled && { opacity: 0.5 }}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};
