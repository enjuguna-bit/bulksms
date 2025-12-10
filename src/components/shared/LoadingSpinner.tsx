import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
}) => {
  const { colors } = useThemeSettings();

  return (
    <View style={styles.container}>
      <ActivityIndicator 
        size={size} 
        color={color || colors.accent} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
