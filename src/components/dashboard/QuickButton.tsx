import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface QuickButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onPress: () => void;
}

export default function QuickButton({ icon, label, color, onPress }: QuickButtonProps) {
  const { colors } = useThemeSettings();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.button, { backgroundColor: colors.card }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          {icon}
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    margin: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
