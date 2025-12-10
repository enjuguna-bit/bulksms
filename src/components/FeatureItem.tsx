import React, { memo } from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

export interface FeatureItemProps {
  /** @deprecated Use title instead */
  text?: string;
  icon?: React.ComponentType<any>;
  title?: string;
  description?: string;
  emphasis?: boolean;
  containerStyle?: ViewStyle;
}

export const FeatureItem = memo(function FeatureItem({
  text,
  icon: Icon,
  title,
  description,
  emphasis,
  containerStyle,
}: FeatureItemProps): JSX.Element {
  const { colors } = useThemeSettings();

  // Support old usage: use "text" as title when title not provided
  const mainTitle = title || text || "";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border
        },
        emphasis && {
          backgroundColor: colors.card, // Or a specific emphasis color from theme
          borderColor: colors.accent
        },
        containerStyle,
      ]}
    >
      {Icon && (
        <View style={styles.iconWrapper}>
          <Icon size={20} color={emphasis ? colors.accent : colors.accent} />
        </View>
      )}

      <View style={styles.textColumn}>
        <Text
          style={[
            styles.title,
            { color: colors.text },
            emphasis && { color: colors.accent },
            !Icon && styles.titleNoIcon,
          ]}
        >
          {mainTitle}
        </Text>

        {description && (
          <Text
            style={[
              styles.description,
              { color: colors.subText },
              emphasis && { color: colors.accent }, // Optional: keep description subtle or match emphasis
            ]}
          >
            {description}
          </Text>
        )}
      </View>
    </View>
  );
});

export default FeatureItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconWrapper: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  titleNoIcon: {
    paddingLeft: 2,
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
});
