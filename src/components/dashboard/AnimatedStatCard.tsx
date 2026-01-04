import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { kenyaColors } from '@/theme/kenyaTheme';
import LinearGradient from 'react-native-linear-gradient';

export type GradientColorKey = keyof typeof kenyaColors.gradients;

interface AnimatedStatCardProps {
  value: number;
  label: string;
  color: GradientColorKey;
  unit?: string;
  trend?: string;
}

export default function AnimatedStatCard({ 
  value, 
  label, 
  color,
  unit,
  trend 
}: AnimatedStatCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);
  
  // Count animation
  useEffect(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: value,
      duration: 1500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false
    });
    
    animation.start();
    return () => animation.stop();
  }, [value, animatedValue]);

  // Pulse animation when value changes significantly
  useEffect(() => {
    if (Math.abs(value - prevValue.current) > (prevValue.current * 0.1)) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: false
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.elastic(1)),
          useNativeDriver: false
        })
      ]).start();
    }
    prevValue.current = value;
  }, [value, pulseAnim]);

  const displayValue = animatedValue.interpolate({
    inputRange: [0, Math.max(value, 1)],
    outputRange: ['0', String(value)],
  });

  return (
    <Animated.View style={[styles.card, { 
      transform: [{ scale: pulseAnim }] 
    }]}>
      <LinearGradient
        colors={kenyaColors.gradients[color]}
        style={styles.gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      >
        <Animated.Text style={styles.value}>
          {displayValue}
        </Animated.Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
        <Text style={styles.label}>{label}</Text>
        {trend && (
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 120,
    overflow: 'hidden'
  },
  gradient: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  unit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  trendBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  trendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
