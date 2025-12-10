import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card, Button, Badge, useToast } from '@/components/ui';
import { EmptyState, LoadingSpinner } from '@/components/shared';

export const ComponentShowcase: React.FC = () => {
  const { colors } = useThemeSettings();
  const { showSuccess, showError, showWarning, showInfo, clearAllToasts } = useToast();

  const handleToastDemo = () => {
    showSuccess('Success message with progress!', 3000, 'top', true);
    setTimeout(() => showError('Error message from bottom', 4000, 'bottom', true), 500);
    setTimeout(() => showWarning('Warning in center', 3500, 'center', false), 1000);
    setTimeout(() => showInfo('Info message', 2500, 'top', true), 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Cards Section */}
      <View style={styles.section}>
        <Card style={styles.sectionCard}>
          <Button
            title="Clear All Toasts"
            variant="outline"
            onPress={clearAllToasts}
            style={styles.button}
          />
        </Card>

        <Card variant="elevated" shadow="lg" style={styles.sectionCard}>
          <Button
            title="Show Toast Demo"
            variant="gradient"
            gradient={colors.gradientPrimary}
            onPress={handleToastDemo}
            style={styles.button}
          />
        </Card>

        <Card
          variant="pressable"
          shadow="md"
          onPress={() => console.log('Card pressed!')}
          style={styles.sectionCard}
        >
          <Button
            title="Pressable Card"
            variant="ghost"
            onPress={() => {}}
          />
        </Card>

        <Card
          gradient={colors.gradientSuccess}
          shadow="xl"
          style={styles.sectionCard}
        >
          <Button
            title="Gradient Card"
            variant="secondary"
            onPress={() => {}}
          />
        </Card>
      </View>

      {/* Badges Section */}
      <View style={styles.section}>
        <Card style={styles.sectionCard}>
          <View style={styles.badgeContainer}>
            <Badge variant="default" size="sm">Default</Badge>
            <Badge variant="success" size="md">Success</Badge>
            <Badge variant="error" size="lg">Error</Badge>
            <Badge variant="warning" size="md">Warning</Badge>
            <Badge variant="info" size="sm">Info</Badge>
          </View>
        </Card>
      </View>

      {/* Button Variants */}
      <View style={styles.section}>
        <Card style={styles.sectionCard}>
          <Button title="Primary" variant="primary" onPress={() => {}} style={styles.button} />
          <Button title="Secondary" variant="secondary" onPress={() => {}} style={styles.button} />
          <Button title="Outline" variant="outline" onPress={() => {}} style={styles.button} />
          <Button title="Ghost" variant="ghost" onPress={() => {}} style={styles.button} />
          <Button title="Loading" loading={true} onPress={() => {}} style={styles.button} />
        </Card>
      </View>

      {/* Empty States */}
      <View style={styles.section}>
        <Card style={styles.sectionCard}>
          <EmptyState type="messages" />
        </Card>
        <Card style={styles.sectionCard}>
          <EmptyState type="contacts" message="No contacts found. Add your first contact!" />
        </Card>
      </View>

      {/* Loading Spinner */}
      <View style={styles.section}>
        <Card style={styles.sectionCard}>
          <LoadingSpinner size="large" />
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    marginBottom: 12,
  },
  button: {
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
