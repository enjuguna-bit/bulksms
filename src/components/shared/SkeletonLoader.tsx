/**
 * SkeletonLoader.tsx
 * Provides reusable skeleton loading components for data-fetching screens
 * Improves perceived performance during data loading
 */

import React, { useEffect } from "react";
import {
  View,
  ViewStyle,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

// ============================================================
// SkeletonPulse - Base animated skeleton component
// ============================================================
interface SkeletonPulseProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
  shimmer?: boolean;
}

export const SkeletonPulse: React.FC<SkeletonPulseProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
  shimmer = true,
}) => {
  const { colors } = useThemeSettings();
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shimmer) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [shimmerAnim, shimmer]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity: shimmer ? opacity : 0.3,
        },
        style,
      ]}
    />
  );
};

// ============================================================
// SkeletonLine - Single line skeleton (text simulation)
// ============================================================
interface SkeletonLineProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = "100%",
  height = 12,
  style,
}) => (
  <SkeletonPulse width={width} height={height} borderRadius={6} style={style} />
);

// ============================================================
// SkeletonCard - Card/List item skeleton
// ============================================================
interface SkeletonCardProps {
  lines?: number;
  hasImage?: boolean;
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 2,
  hasImage = true,
  style,
}) => {
  const { colors } = useThemeSettings();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginVertical: 8,
          marginHorizontal: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        {hasImage && (
          <SkeletonPulse width={50} height={50} borderRadius={8} />
        )}
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonLine width="70%" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <SkeletonLine
              key={i}
              width={i === lines - 2 ? "90%" : "100%"}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================================
// SkeletonListLoader - Multiple skeleton cards
// ============================================================
interface SkeletonListLoaderProps {
  count?: number;
  cardType?: "simple" | "image" | "full";
  style?: ViewStyle;
}

export const SkeletonListLoader: React.FC<SkeletonListLoaderProps> = ({
  count = 3,
  cardType = "simple",
  style,
}) => {
  const getCardConfig = () => {
    switch (cardType) {
      case "image":
        return { hasImage: true, lines: 2 };
      case "full":
        return { hasImage: true, lines: 3 };
      case "simple":
      default:
        return { hasImage: false, lines: 2 };
    }
  };

  const config = getCardConfig();

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...config} />
      ))}
    </View>
  );
};

// ============================================================
// SkeletonStatCard - Dashboard statistics card skeleton
// ============================================================
export const SkeletonStatCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors } = useThemeSettings();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          margin: 8,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 100,
        },
        style,
      ]}
    >
      <SkeletonLine width="50%" height={14} style={{ marginBottom: 12 }} />
      <SkeletonLine width="40%" height={24} style={{ marginBottom: 8 }} />
      <SkeletonLine width="60%" height={12} />
    </View>
  );
};

// ============================================================
// SkeletonGrid - Grid of skeleton items
// ============================================================
interface SkeletonGridProps {
  columns?: number;
  count?: number;
  itemHeight?: number;
  style?: ViewStyle;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  columns = 2,
  count = 4,
  itemHeight = 150,
  style,
}) => {
  const { colors } = useThemeSettings();

  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap" }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: `${100 / columns}%`,
            padding: 8,
          }}
        >
          <SkeletonPulse
            width="100%"
            height={itemHeight}
            borderRadius={12}
            style={{ backgroundColor: colors.card }}
          />
        </View>
      ))}
    </View>
  );
};

// ============================================================
// SkeletonLoadingOverlay - Full screen loading state
// ============================================================
interface SkeletonLoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingContent?: React.ReactNode;
}

export const SkeletonLoadingOverlay: React.FC<SkeletonLoadingOverlayProps> = ({
  isLoading,
  children,
  loadingContent,
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <>
      {loadingContent || (
        <View style={{ flex: 1 }}>
          <SkeletonListLoader count={3} cardType="image" />
        </View>
      )}
    </>
  );
};
