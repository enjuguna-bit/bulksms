import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';

// Types
interface Recipient {
  name: string;
  phone: string;
  amount?: number;
  fields?: Record<string, any>;
}

interface OptimizedRecipientsListProps {
  recipients: Recipient[];
  loading?: boolean;
  showAmounts?: boolean;
  showFields?: boolean;
}

/**
 * Memoized recipient item component for bulk SMS lists
 */
const RecipientItem = memo(({
  recipient,
  showAmounts = false,
  showFields = false,
  index,
}: {
  recipient: Recipient;
  showAmounts?: boolean;
  showFields?: boolean;
  index: number;
}) => {
  const formatAmount = (amount?: number) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const hasAdditionalFields = recipient.fields && Object.keys(recipient.fields).length > 0;

  return (
    <View style={[styles.recipientItem, index % 2 === 0 && styles.evenItem]}>
      <View style={styles.recipientInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {recipient.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.recipientDetails}>
          <Text style={styles.recipientName} numberOfLines={1}>
            {recipient.name || 'Unknown'}
          </Text>
          <Text style={styles.recipientPhone}>
            {recipient.phone}
          </Text>

          {showAmounts && recipient.amount && (
            <Text style={styles.amount}>
              {formatAmount(recipient.amount)}
            </Text>
          )}
        </View>
      </View>

      {showFields && hasAdditionalFields && (
        <View style={styles.fieldsContainer}>
          {Object.entries(recipient.fields!)
            .filter(([key]) => key !== 'name' && key !== 'phone' && key !== 'amount')
            .slice(0, 2) // Show only first 2 additional fields
            .map(([key, value]) => (
              <Text key={key} style={styles.fieldText} numberOfLines={1}>
                {key}: {String(value)}
              </Text>
            ))}
          {Object.keys(recipient.fields!).length > 3 && (
            <Text style={styles.moreFields}>+{Object.keys(recipient.fields!).length - 3} more</Text>
          )}
        </View>
      )}
    </View>
  );
});

RecipientItem.displayName = 'RecipientItem';

/**
 * Optimized recipients list for bulk SMS campaigns
 * Uses FlashList for efficient rendering of large recipient lists
 */
export const OptimizedRecipientsList = memo(({
  recipients,
  loading = false,
  showAmounts = false,
  showFields = false,
}: OptimizedRecipientsListProps) => {
  const renderItem = ({ item, index }: { item: Recipient; index: number }) => (
    <RecipientItem
      recipient={item}
      showAmounts={showAmounts}
      showFields={showFields}
      index={index}
    />
  );

  const keyExtractor = (item: Recipient, index: number) =>
    `${item.phone}-${index}`;

  const ListHeaderComponent = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>
        {recipients.length} recipients
      </Text>
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading recipients...' : 'No recipients selected'}
      </Text>
    </View>
  );

  // Memoize data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => recipients, [recipients]);

  return (
    <FlashList
      data={memoizedData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={showFields ? 100 : 70}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={recipients.length === 0 ? styles.emptyListContainer as any : undefined}
      // Performance optimizations for large lists
      removeClippedSubviews={true}
    />
  );
});

OptimizedRecipientsList.displayName = 'OptimizedRecipientsList';

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  recipientItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  evenItem: {
    backgroundColor: '#FAFAFA',
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#43B02A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  recipientPhone: {
    fontSize: 13,
    color: '#8E8E93',
  },
  amount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#43B02A',
    marginTop: 2,
  },
  fieldsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  fieldText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  moreFields: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
});
