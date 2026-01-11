import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { NativeModules } from 'react-native';
import { Check, Phone, X } from 'lucide-react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

const { CallManagerModule } = NativeModules;

interface SimInfo {
  subscriptionId: number;
  simSlotIndex: number;
  displayName: string;
  carrierName: string;
  countryIso: string;
  number: string;
  mcc: number;
  mnc: number;
}

interface SimSelectionDialogProps {
  visible: boolean;
  onSelect: (subscriptionId: number | null) => void;
  onCancel: () => void;
}

export const SimSelectionDialog: React.FC<SimSelectionDialogProps> = ({
  visible,
  onSelect,
  onCancel,
}) => {
  const { colors } = useThemeSettings();
  const [sims, setSims] = useState<SimInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSim, setSelectedSim] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadAvailableSims();
    } else {
      // Reset state when dialog closes
      setError(null);
      setSelectedSim(null);
    }
  }, [visible]);

  const loadAvailableSims = async () => {
    setLoading(true);
    setError(null);
    try {
      const availableSims = await CallManagerModule.getAvailableSims();
      setSims(availableSims || []);
      // Auto-select first SIM if available
      if (availableSims && availableSims.length > 0) {
        setSelectedSim(availableSims[0].subscriptionId);
      }
    } catch (error: any) {
      console.error('Error loading SIMs:', error);
      let errorMessage = 'Failed to load SIM cards';

      if (error.code === 'READ_PHONE_STATE_PERMISSION_DENIED') {
        errorMessage = 'Permission needed to access SIM information. Please grant READ_PHONE_STATE permission.';
      } else if (error.code === 'SUBSCRIPTION_MANAGER_UNAVAILABLE') {
        errorMessage = 'SIM information is not available on this device.';
      } else if (error.code === 'SIM_INFO_ERROR') {
        errorMessage = 'Unable to read SIM card information.';
      }

      setError(errorMessage);
      setSims([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedSim);
  };

  const handleCancel = () => {
    setSelectedSim(null);
    onCancel();
  };

  const renderSimItem = ({ item }: { item: SimInfo }) => (
    <TouchableOpacity
      style={[
        styles.simItem,
        {
          backgroundColor: selectedSim === item.subscriptionId ? colors.accent + '20' : colors.card,
          borderColor: selectedSim === item.subscriptionId ? colors.accent : colors.border,
        },
      ]}
      onPress={() => setSelectedSim(item.subscriptionId)}
      activeOpacity={0.7}
    >
      <View style={styles.simInfo}>
        <View style={styles.simIcon}>
          <Phone size={20} color={colors.text} />
        </View>
        <View style={styles.simDetails}>
          <Text style={[styles.simName, { color: colors.text }]}>
            {item.displayName}
          </Text>
          <Text style={[styles.simCarrier, { color: colors.subText }]}>
            {item.carrierName} {item.countryIso && `(${item.countryIso.toUpperCase()})`}
          </Text>
          {item.number && (
            <Text style={[styles.simNumber, { color: colors.subText }]}>
              {item.number}
            </Text>
          )}
        </View>
        {selectedSim === item.subscriptionId && (
          <View style={styles.checkIcon}>
            <Check size={20} color={colors.accent} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Select SIM Card
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <X size={24} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.subText }]}>
                Loading SIM cards...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <X size={48} color={colors.error || '#ff4444'} />
              <Text style={[styles.errorText, { color: colors.error || '#ff4444' }]}>
                Error
              </Text>
              <Text style={[styles.errorSubtext, { color: colors.subText }]}>
                {error}
              </Text>
            </View>
          ) : sims.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Phone size={48} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                No SIM cards found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.subText }]}>
                Using default SIM for calls
              </Text>
            </View>
          ) : (
            <FlatList
              data={sims}
              keyExtractor={(item) => item.subscriptionId.toString()}
              renderItem={renderSimItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.simList}
            />
          )}

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelText, { color: colors.subText }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: selectedSim !== null ? colors.accent : colors.border,
                },
              ]}
              onPress={handleConfirm}
              disabled={selectedSim === null}
            >
              <Text style={styles.confirmText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  simList: {
    padding: 20,
    paddingTop: 0,
  },
  simItem: {
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    padding: 16,
  },
  simInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simIcon: {
    marginRight: 12,
  },
  simDetails: {
    flex: 1,
  },
  simName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  simCarrier: {
    fontSize: 14,
    marginBottom: 2,
  },
  simNumber: {
    fontSize: 14,
  },
  checkIcon: {
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginRight: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
