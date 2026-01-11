import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import Contacts from 'react-native-contacts';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  CheckCircle,
  User,
  ChevronRight,
  Search,
  Database,
  X,
  Phone
} from 'lucide-react-native';
import { getCustomerContacts } from '@/services/customerService';
import { Linking, Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { SimSelectionDialog } from '@/components/SimSelectionDialog';

const { CallManagerModule } = NativeModules as {
  CallManagerModule: {
    hasMultipleSims: () => Promise<boolean>;
    getAvailableSims: () => Promise<Array<{
      subscriptionId: number;
      simSlotIndex: number;
      displayName: string;
      carrierName: string;
      countryIso: string;
      number: string;
      mcc: number;
      mnc: number;
    }>>;
    makeCall: (phoneNumber: string, subscriptionId: number | null) => Promise<{ success: boolean; message: string }>;
    canMakeCalls: () => Promise<boolean>;
  };
};

interface Contact {
  id: string;
  name: string;
  phone: string;
  isCustomer?: boolean;
}

interface SplitContactsScreenProps {
  navigation: any;
  route: any;
}

export default function SplitContactsScreen({ navigation }: SplitContactsScreenProps) {
  const { colors } = useThemeSettings();
  const [customerContacts, setCustomerContacts] = useState<Contact[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [paneRatio, setPaneRatio] = useState(0.5);
  const pan = useState(new Animated.Value(0))[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [showSimDialog, setShowSimDialog] = useState(false);
  const [pendingCallNumber, setPendingCallNumber] = useState<string>('');
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const [customers, device] = await Promise.all([
          getCustomerContacts(),
          loadDeviceContacts()
        ]);
        setCustomerContacts(customers.map(c => ({ ...c, isCustomer: true })));
        setDeviceContacts(device);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  const loadDeviceContacts = async () => {
    try {
      const granted = await Contacts.requestPermission();
      if (granted === 'authorized') {
        const contacts = await Contacts.getAll();
        return contacts.map(c => ({
          id: c.recordID,
          name: c.displayName || `${c.givenName} ${c.familyName}`.trim(),
          phone: c.phoneNumbers[0]?.number || ''
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load device contacts:', error);
      return [];
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newRatio = Math.min(Math.max(0.3, paneRatio + gestureState.dx / 300), 0.7);
      pan.setValue(newRatio * 100 - 50); // Visual feedback during drag
      return true;
    },
    onPanResponderRelease: (_, gestureState) => {
      const newRatio = Math.min(Math.max(0.3, paneRatio + gestureState.dx / 300), 0.7);
      setPaneRatio(newRatio);
      pan.setValue(0);
      ReactNativeHapticFeedback.trigger("selection");
    }
  });

  const handleContactPress = (contact: Contact) => {
    ReactNativeHapticFeedback.trigger("selection");

    // Navigate based on contact type
    if (contact.isCustomer) {
      // Navigate to customer details
      navigation.navigate('CustomerDetails', { customerId: contact.id });
    } else {
      // Navigate to chat with device contact
      navigation.navigate('ChatScreen', {
        address: contact.phone,
        name: contact.name
      });
    }
  };

  const handleCallPress = async (phoneNumber: string) => {
    try {
      setPendingCallNumber(phoneNumber);
      setIsCalling(true);

      // Check if device has multiple SIMs
      const hasMultipleSims = await CallManagerModule.hasMultipleSims();
      if (hasMultipleSims) {
        setShowSimDialog(true);
      } else {
        await makeCallWithSim(null);
      }
    } catch (error) {
      console.error('Call failed:', error);
      ReactNativeHapticFeedback.trigger("notificationError");
      Alert.alert(
        "Call Failed",
        "Could not initiate call. Please check your device settings."
      );
    } finally {
      setIsCalling(false);
    }
  };

  const handleSimSelected = async (subscriptionId: number | null) => {
    setShowSimDialog(false);
    await makeCallWithSim(subscriptionId);
    setPendingCallNumber('');
  };

  const handleSimDialogCancel = () => {
    setShowSimDialog(false);
    setPendingCallNumber('');
    setIsCalling(false);
  };

  const makeCallWithSim = async (subscriptionId: number | null) => {
    try {
      const result = await CallManagerModule.makeCall(pendingCallNumber, subscriptionId);
      if (result.success) {
        ReactNativeHapticFeedback.trigger("notificationSuccess");
      } else {
        ReactNativeHapticFeedback.trigger("notificationError");
        Alert.alert(
          "Call Failed",
          result.message || "Could not initiate call"
        );
      }
    } catch (error) {
      console.error('Call failed:', error);
      ReactNativeHapticFeedback.trigger("notificationError");
      Alert.alert(
        "Call Failed",
        "Could not initiate call. Please check your device settings."
      );
    } finally {
      setIsCalling(false);
    }
  };

  const filteredCustomerContacts = useMemo(() => {
    if (!searchQuery) return customerContacts;
    const query = searchQuery.toLowerCase();
    return customerContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phone.includes(query)
    );
  }, [customerContacts, searchQuery]);

  const filteredDeviceContacts = useMemo(() => {
    if (!searchQuery) return deviceContacts;
    const query = searchQuery.toLowerCase();
    return deviceContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phone.includes(query)
    );
  }, [deviceContacts, searchQuery]);

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactContainer}>
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactPress(item)}
      >
        {item.isCustomer ? (
          <Database color={colors.accent} size={20} />
        ) : (
          <User color={colors.text} size={20} />
        )}
        <Text style={[styles.contactName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.subText }]}>
          {item.phone}
        </Text>
        <ChevronRight color={colors.subText} size={20} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleCallPress(item.phone)}
        style={styles.callButton}
      >
        <Phone size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Search size={20} color={colors.subText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={colors.subText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color={colors.subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.splitView}>
        {/* Customer Contacts Pane */}
        <View style={[styles.pane, { flex: paneRatio }]}>
          <Text style={[styles.paneTitle, { color: colors.accent }]}>
            Customer Database ({filteredCustomerContacts.length})
          </Text>
          <FlatList
            data={filteredCustomerContacts}
            renderItem={renderContact}
            keyExtractor={item => item.id}
          />
        </View>

        {/* Draggable Divider */}
        <Animated.View
          style={[
            styles.divider,
            {
              backgroundColor: colors.border,
              transform: [{ translateX: pan }]
            }
          ]}
          {...panResponder.panHandlers}
        />

        {/* Device Contacts Pane */}
        <View style={[styles.pane, { flex: 1 - paneRatio }]}>
          <Text style={[styles.paneTitle, { color: colors.accent }]}>
            Device Contacts ({filteredDeviceContacts.length})
          </Text>
          <FlatList
            data={filteredDeviceContacts}
            renderItem={renderContact}
            keyExtractor={item => item.id}
          />
        </View>
      </View>

      <SimSelectionDialog
        visible={showSimDialog}
        onSelect={handleSimSelected}
        onCancel={handleSimDialogCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  splitView: {
    flex: 1,
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pane: {
    padding: 12,
    flex: 1
  },
  paneTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  divider: {
    width: 2,
    marginHorizontal: 4,
    cursor: 'col-resize' as any
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  contactName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16
  },
  contactPhone: {
    marginRight: 12,
    fontSize: 14
  },
  callButton: {
    padding: 8,
    marginRight: 8
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 12,
    borderRadius: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8
  }
});
