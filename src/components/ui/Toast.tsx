import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Check, X, AlertTriangle, Info } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top' | 'bottom' | 'center';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  position?: ToastPosition;
  showProgress?: boolean;
  onHide: () => void;
  index: number;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  duration = 3000,
  position = 'top',
  showProgress = true,
  onHide,
  index,
}) => {
  const { colors } = useThemeSettings();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [progressAnim] = useState(new Animated.Value(1));
  const [translateX] = useState(new Animated.Value(0));

  const hideToast = useCallback(() => {
    const slideOutValue = position === 'bottom' ? 100 : (position === 'center' ? 0 : -100);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: slideOutValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, [fadeAnim, slideAnim, position, onHide]);

  useEffect(() => {
    // Calculate initial position based on toast position
    const initialSlideValue = position === 'bottom' ? 100 : (position === 'center' ? 0 : -100);
    slideAnim.setValue(initialSlideValue);

    // Show animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress animation
    if (showProgress && duration > 0) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();
    }

    // Auto hide
    const timer = setTimeout(() => {
      hideToast();
    }, duration);

    return () => clearTimeout(timer);
  }, [position, showProgress, duration, fadeAnim, slideAnim, progressAnim, hideToast]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      if (Math.abs(translationX) > width * 0.3) {
        // Swipe to dismiss
        Animated.timing(translateX, {
          toValue: translationX > 0 ? width : -width,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onHide());
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  const getToastStyle = () => {
    const base = {
      backgroundColor: colors.card,
      borderColor: colors.border,
    };

    switch (type) {
      case 'success':
        return { ...base, borderLeftColor: colors.success };
      case 'error':
        return { ...base, borderLeftColor: colors.error };
      case 'warning':
        return { ...base, borderLeftColor: colors.warning };
      case 'info':
        return { ...base, borderLeftColor: colors.accent };
      default:
        return base;
    }
  };

  const getIcon = () => {
    const iconColor = type === 'success' ? colors.success :
                     type === 'error' ? colors.error :
                     type === 'warning' ? colors.warning : colors.accent;

    switch (type) {
      case 'success':
        return <Check size={20} color={iconColor} />;
      case 'error':
        return <X size={20} color={iconColor} />;
      case 'warning':
        return <AlertTriangle size={20} color={iconColor} />;
      case 'info':
        return <Info size={20} color={iconColor} />;
      default:
        return null;
    }
  };

  const getPositionStyle = () => {
    const baseOffset = position === 'bottom' ? height - 150 : (position === 'center' ? height / 2 - 50 : 50);
    const stackOffset = index * 10; // Stack multiple toasts
    
    return {
      top: position === 'bottom' ? undefined : baseOffset + stackOffset,
      bottom: position === 'bottom' ? baseOffset + stackOffset : undefined,
    };
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.container,
          getPositionStyle(),
          {
            transform: [{ translateY: slideAnim }, { translateX }],
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={[styles.toast, getToastStyle()]}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          <View style={styles.contentContainer}>
            <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
              {message}
            </Text>
            {showProgress && duration > 0 && (
              <View style={[styles.progressContainer, { borderColor: colors.border }]}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor: type === 'success' ? colors.success :
                                       type === 'error' ? colors.error :
                                       type === 'warning' ? colors.warning : colors.accent,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
    height: 2,
    borderRadius: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});
