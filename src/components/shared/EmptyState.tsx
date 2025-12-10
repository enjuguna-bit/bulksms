import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Inbox, FileText, Users } from 'lucide-react-native';

type EmptyStateType = 'logs' | 'messages' | 'contacts' | 'generic';

interface EmptyStateProps {
  type: EmptyStateType;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  message,
}) => {
  const { colors } = useThemeSettings();

  const getIcon = () => {
    const iconColor = colors.subText;
    
    switch (type) {
      case 'logs':
        return <FileText size={48} color={iconColor} />;
      case 'messages':
        return <Inbox size={48} color={iconColor} />;
      case 'contacts':
        return <Users size={48} color={iconColor} />;
      default:
        return <Inbox size={48} color={iconColor} />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'logs':
        return 'No message logs available.';
      case 'messages':
        return 'No messages yet.';
      case 'contacts':
        return 'No contacts found.';
      default:
        return 'No data available.';
    }
  };

  return (
    <View style={styles.container}>
      {getIcon()}
      <Text style={[styles.message, { color: colors.subText }]}>
        {message || getDefaultMessage()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
    lineHeight: 24,
  },
});
