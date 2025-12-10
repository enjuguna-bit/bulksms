import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const { colors } = useThemeSettings();

  const getBadgeStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    };

    const sizeStyles = {
      sm: { paddingHorizontal: 8, paddingVertical: 2, minHeight: 20 },
      md: { paddingHorizontal: 12, paddingVertical: 4, minHeight: 24 },
      lg: { paddingHorizontal: 16, paddingVertical: 6, minHeight: 32 },
    };

    const variantStyles = {
      default: { backgroundColor: colors.chip },
      success: { backgroundColor: colors.success },
      error: { backgroundColor: colors.error },
      warning: { backgroundColor: colors.warning },
      info: { backgroundColor: colors.accent },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = () => {
    const base = {
      fontWeight: '600' as const,
    };

    const sizeStyles = {
      sm: { fontSize: 10 },
      md: { fontSize: 12 },
      lg: { fontSize: 14 },
    };

    const variantStyles = {
      default: { color: colors.text },
      success: { color: '#ffffff' },
      error: { color: '#ffffff' },
      warning: { color: '#ffffff' },
      info: { color: '#ffffff' },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={getTextStyle()}>{children}</Text>
    </View>
  );
};
