import React, { memo, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, Check } from 'lucide-react-native';

// Types
interface SimpleContact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

interface Recipient {
  name: string;
  phone: string;
  amount?: number;
  fields?: Record<string, any>;
}

interface OptimizedContactsListProps {
  contacts: SimpleContact[];
  selectedIds: Set<string>;
  onToggleSelection: (contactId: string) => void;
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Memoized contact item component with selection state
 */
const ContactItem = memo(({
  contact,
  isSelected,
  onToggleSelection,
  searchQuery,
}: {
  contact: SimpleContact;
  isSelected: boolean;
  onToggleSelection: (contactId: string) => void;
  searchQuery?: string;
}) => {
  // Highlight search matches
  const getHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = regex.test(part);
      return isMatch ? (
        <Text key={index} style={styles.highlightedText}>{part}</Text>
      ) : (
        <Text key={index}>{part}</Text>
      );
    });
  };

  return (
    <TouchableOpacity
      style={[styles.contactItem, isSelected && styles.selectedContactItem]}
      onPress={() => onToggleSelection(contact.id)}
      activeOpacity={0.7}
    >
      <View style={styles.contactInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.contactDetails}>
          <Text style={styles.contactName} numberOfLines={1}>
            {searchQuery ? getHighlightedText(contact.name, searchQuery) : contact.name}
          </Text>
          <Text style={styles.contactPhone} numberOfLines={1}>
            {contact.phoneNumbers[0] || 'No phone number'}
          </Text>
          {contact.phoneNumbers.length > 1 && (
            <Text style={styles.additionalPhones}>
              +{contact.phoneNumbers.length - 1} more
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Check size={16} color="#FFFFFF" />}
      </View>
    </TouchableOpacity>
  );
});

ContactItem.displayName = 'ContactItem';

/**
 * Optimized contacts list with search and selection
 * Uses FlashList for virtualization and efficient search
 */
export const OptimizedContactsList = memo(({
  contacts,
  selectedIds,
  onToggleSelection,
  loading = false,
  searchQuery = '',
  onSearchChange,
}: OptimizedContactsListProps) => {
  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumbers.some(phone => phone.includes(query))
    );
  }, [contacts, searchQuery]);

  const renderItem = ({ item }: { item: SimpleContact }) => (
    <ContactItem
      contact={item}
      isSelected={selectedIds.has(item.id)}
      onToggleSelection={onToggleSelection}
      searchQuery={searchQuery}
    />
  );

  const keyExtractor = (item: SimpleContact) => item.id;

  const ListHeaderComponent = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#8E8E93"
        />
      </View>
      <Text style={styles.selectionCount}>
        {selectedIds.size} selected
      </Text>
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading contacts...' : 'No contacts found'}
      </Text>
    </View>
  );

  return (
    <FlashList
      data={filteredContacts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={70}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={filteredContacts.length === 0 ? styles.emptyListContainer as any : undefined}
      // Performance optimizations
      removeClippedSubviews={true}
    />
  );
});

OptimizedContactsList.displayName = 'OptimizedContactsList';

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectionCount: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  selectedContactItem: {
    backgroundColor: '#E8F5E8',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#43B02A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#8E8E93',
  },
  additionalPhones: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#43B02A',
    borderColor: '#43B02A',
  },
  highlightedText: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
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
