import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

declare global {
  interface Window {
    LineChart?: any;
  }
}

interface SmsVolumeChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity: number) => string;
    }>;
  };
}

export default function SmsVolumeChart({ data }: SmsVolumeChartProps) {
  const { colors } = useThemeSettings();
  
  // Fallback if chart library not available
  if (!window.LineChart) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text }}>Chart functionality not available</Text>
      </View>
    );
  }

  const LineChart = window.LineChart;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>SMS Volume</Text>
      <LineChart
        data={data}
        width={300}
        height={200}
        chartConfig={{
          backgroundColor: colors.card,
          backgroundGradientFrom: colors.card,
          backgroundGradientTo: colors.card,
          decimalPlaces: 0,
          color: (opacity = 1) => colors.accent,
          labelColor: (opacity = 1) => colors.text,
          style: { borderRadius: 16 },
          propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent }
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    alignItems: 'center'
  },
  fallbackContainer: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  chart: {
    borderRadius: 16,
    paddingRight: 20
  }
});
