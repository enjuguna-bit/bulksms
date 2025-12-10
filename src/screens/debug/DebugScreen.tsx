// src/screens/debug/DebugScreen.tsx
// Comprehensive debug screen with diagnostics and tools

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useBilling } from '@/providers/BillingProvider';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { initDatabase, runQuery } from '@/db/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { CONFIG } from '@/constants/config';
import { safeReload } from '@/utils/safeReload';
import Logger from '@/utils/logger';

interface DebugInfo {
  appVersion: string;
  buildNumber: string;
  deviceId: string;
  deviceName: string;
  systemVersion: string;
  isDev: boolean;
  developerBypass: boolean;
  databaseStatus: string;
  billingStatus: string;
  asyncStorageKeys: string[];
  dbMessageCount: number;
  dbTransactionCount: number;
  dbQueueCount: number;
}

export default function DebugScreen() {
  const { colors } = useThemeSettings();
  const { status, isPro, trialDaysLeft, subDaysLeft } = useBilling();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDebugInfo = async () => {
    try {
      const appVersion = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = DeviceInfo.getDeviceName();
      const systemVersion = DeviceInfo.getSystemVersion();

      // Database status
      let databaseStatus = 'Unknown';
      let dbMessageCount = 0;
      let dbTransactionCount = 0;
      let dbQueueCount = 0;

      try {
        await initDatabase();
        databaseStatus = 'Connected';
        
        // Get counts
        const messagesResult = await runQuery('SELECT COUNT(*) as count FROM messages', []);
        dbMessageCount = messagesResult?.rows?.item(0)?.count || 0;

        const transactionsResult = await runQuery('SELECT COUNT(*) as count FROM payment_records', []);
        dbTransactionCount = transactionsResult?.rows?.item(0)?.count || 0;

        const queueResult = await runQuery('SELECT COUNT(*) as count FROM sms_queue', []);
        dbQueueCount = queueResult?.rows?.item(0)?.count || 0;
      } catch (e) {
        databaseStatus = `Error: ${e instanceof Error ? e.message : String(e)}`;
      }

      // AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();

      setDebugInfo({
        appVersion,
        buildNumber,
        deviceId,
        deviceName,
        systemVersion,
        isDev: __DEV__,
        developerBypass: CONFIG.DEVELOPER_BYPASS,
        databaseStatus,
        billingStatus: `${status}${isPro ? ' (Pro)' : ''}`,
        asyncStorageKeys: allKeys,
        dbMessageCount,
        dbTransactionCount,
        dbQueueCount,
      });
    } catch (error) {
      Logger.error('DebugScreen', 'Failed to load debug info', error);
      Alert.alert('Error', 'Failed to load debug information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDebugInfo();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear AsyncStorage cache. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys);
              Alert.alert('Success', 'Cache cleared');
              loadDebugInfo();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleReload = () => {
    Alert.alert(
      'Reload App',
      'This will reload the JavaScript bundle. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reload',
          onPress: () => {
            safeReload();
          },
        },
      ]
    );
  };

  const handleTestError = () => {
    Alert.alert(
      'Test Error',
      'This will trigger a test error boundary. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test',
          onPress: () => {
            throw new Error('Test error from debug screen');
          },
        },
      ]
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: string | number | boolean }) => (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.subText }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{String(value)}</Text>
    </View>
  );

  const ActionButton = ({
    title,
    onPress,
    destructive = false,
  }: {
    title: string;
    onPress: () => void;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor: destructive ? '#ef4444' : colors.accent,
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Loading debug info...</Text>
      </View>
    );
  }

  if (!debugInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load debug information</Text>
        <ActionButton title="Retry" onPress={loadDebugInfo} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
      }
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>App Information</Text>
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          <InfoRow label="Version" value={debugInfo.appVersion} />
          <InfoRow label="Build" value={debugInfo.buildNumber} />
          <InfoRow label="Device ID" value={debugInfo.deviceId} />
          <InfoRow label="Device Name" value={debugInfo.deviceName} />
          <InfoRow label="System Version" value={debugInfo.systemVersion} />
          <InfoRow label="Dev Mode" value={debugInfo.isDev ? 'Yes' : 'No'} />
          <InfoRow label="Developer Bypass" value={debugInfo.developerBypass ? 'Enabled' : 'Disabled'} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Database Status</Text>
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          <InfoRow label="Status" value={debugInfo.databaseStatus} />
          <InfoRow label="Messages" value={debugInfo.dbMessageCount} />
          <InfoRow label="Transactions" value={debugInfo.dbTransactionCount} />
          <InfoRow label="Queue Items" value={debugInfo.dbQueueCount} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Billing Status</Text>
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          <InfoRow label="Status" value={debugInfo.billingStatus} />
          {trialDaysLeft !== null && <InfoRow label="Trial Days Left" value={trialDaysLeft} />}
          {subDaysLeft !== null && <InfoRow label="Subscription Days Left" value={subDaysLeft} />}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>AsyncStorage Keys</Text>
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          {debugInfo.asyncStorageKeys.length > 0 ? (
            debugInfo.asyncStorageKeys.map((key) => (
              <InfoRow key={key} label={key} value="" />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.subText }]}>No keys found</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Debug Actions</Text>
        <View style={styles.actionsContainer}>
          <ActionButton title="Refresh Info" onPress={handleRefresh} />
          <ActionButton title="Reload App" onPress={handleReload} />
          <ActionButton title="Clear Cache" onPress={handleClearCache} destructive />
          {__DEV__ && <ActionButton title="Test Error" onPress={handleTestError} destructive />}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuration</Text>
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          <InfoRow label="DB Messages" value={CONFIG.DB_MESSAGES} />
          <InfoRow label="DB Transactions" value={CONFIG.DB_TRANSACTIONS} />
          <InfoRow label="Activation Server" value={CONFIG.ACTIVATION_SERVER_URL} />
          <InfoRow label="Merchant Till" value={CONFIG.MERCHANT_TILL} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoContainer: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

