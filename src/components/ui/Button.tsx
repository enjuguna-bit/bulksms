import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator 
} from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: string[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  gradient,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { colors } = useThemeSettings();

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    };

    const sizeStyles = {
      sm: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 },
      md: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
      lg: { paddingHorizontal: 20, paddingVertical: 16, minHeight: 52 },
    };

    const variantStyles = {
      primary: { backgroundColor: colors.accent },
      secondary: { backgroundColor: colors.chip },
      outline: { 
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.accent,
      },
      ghost: { backgroundColor: 'transparent' },
      gradient: { backgroundColor: 'transparent' },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
    };

    const sizeStyles = {
      sm: { fontSize: 14 },
      md: { fontSize: 16 },
      lg: { fontSize: 18 },
    };

    const variantStyles = {
      primary: { color: '#ffffff' },
      secondary: { color: colors.text },
      outline: { color: colors.accent },
      ghost: { color: colors.accent },
      gradient: { color: '#ffffff' },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator color={getTextStyle().color} size="small" />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </>
  );

  if (variant === 'gradient') {
    const gradientColors = gradient || colors.gradientPrimary;
    
    try {
      // Try to import LinearGradient dynamically
      const LinearGradient = require("expo-linear-gradient").LinearGradient;
      
      const gradientButton = (
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[getButtonStyle(), style]}
        >
          {buttonContent}
        </LinearGradient>
      );

      return (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.7}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={accessibilityHint}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
        >
          {gradientButton}
        </TouchableOpacity>
      );
    } catch (error) {
      // Fallback to solid background if LinearGradient is not available
      return (
        <TouchableOpacity
          style={[getButtonStyle(), { backgroundColor: gradientColors[0] }, style]}
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.7}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={accessibilityHint}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
        >
          {buttonContent}
        </TouchableOpacity>
      );
    }
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};
