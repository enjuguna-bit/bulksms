import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface PerformanceWidgetsProps {
  deliveryRate: number;
  messagesPerMinute: number;
  estimatedCost: number;
}

export default function PerformanceWidgets({ 
  deliveryRate, 
  messagesPerMinute,
  estimatedCost 
}: PerformanceWidgetsProps) {
  const { colors } = useThemeSettings();

  // Circular progress for delivery rate
  const CircularGauge = ({ value }: { value: number }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <View style={styles.gaugeContainer}>
        <View style={[
          styles.gaugeBackground,
          { borderColor: colors.border }
        ]} />
        <View style={[
          styles.gaugeFill,
          { 
            borderColor: value > 90 ? '#10B981' : 
                         value > 70 ? '#3B82F6' : '#EF4444',
            transform: [{ rotate: `${-90 + (value * 3.6)}deg` }]
          }
        ]} />
        <Text style={[styles.gaugeText, { color: colors.text }]}>
          {value}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.widget}>
        <Text style={[styles.widgetTitle, { color: colors.text }]}>Delivery Rate</Text>
        <CircularGauge value={deliveryRate} />
      </View>
      
      <View style={styles.widget}>
        <Text style={[styles.widgetTitle, { color: colors.text }]}>Speed</Text>
        <Text style={[styles.speedText, { color: colors.text }]}>
          {messagesPerMinute.toFixed(1)} msg/min
        </Text>
      </View>
      
      <View style={styles.widget}>
        <Text style={[styles.widgetTitle, { color: colors.text }]}>Cost</Text>
        <Text style={[styles.costText, { color: colors.text }]}>
          KES {estimatedCost.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 16
  },
  widget: {
    alignItems: 'center',
    flex: 1
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  gaugeContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  gaugeBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 6,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent'
  },
  gaugeFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 6,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent'
  },
  gaugeText: {
    fontSize: 14,
    fontWeight: '700'
  },
  speedText: {
    fontSize: 16,
    fontWeight: '700'
  },
  costText: {
    fontSize: 16,
    fontWeight: '700'
  }
});
