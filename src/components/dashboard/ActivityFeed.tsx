import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

interface ActivityItem {
  id: string;
  type: 'sms' | 'mpesa';
  status: 'success' | 'failed' | 'pending';
  phone: string;
  timestamp: number;
  amount?: number;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const { colors } = useThemeSettings();

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <View style={[styles.item, { backgroundColor: colors.card }]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.phone, { color: colors.text }]}>
          {item.phone}
        </Text>
        <Text style={[
          styles.status,
          item.status === 'success' ? { color: '#10B981' } :
          item.status === 'failed' ? { color: '#EF4444' } :
          { color: '#F59E0B' }
        ]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.time, { color: colors.subText }]}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>
      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16
  },
  listContent: {
    paddingHorizontal: 16,
  },
  item: {
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    width: 160,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  phone: {
    fontSize: 14,
    fontWeight: '600'
  },
  status: {
    fontSize: 12,
    fontWeight: '700'
  },
  time: {
    fontSize: 12
  }
});
