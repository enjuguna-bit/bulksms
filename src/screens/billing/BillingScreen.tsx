// -------------------------------------------------------------
// 💳 BillingScreen - M-Pesa Payment Plans UI
// -------------------------------------------------------------

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, CreditCard, TrendingUp } from 'lucide-react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';
import PaymentCard from '@/components/billing/PaymentCard';
import {
  DEFAULT_PAYMENT_PLANS,
  calculateBillingStats,
  type PaymentPlan,
} from '@/types/billing';

const MPESA_GREEN = '#006400';

export default function BillingScreen(): JSX.Element {
  const { theme } = useThemeSettings();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [plans] = useState<PaymentPlan[]>(DEFAULT_PAYMENT_PLANS);

  // Filter plans based on search
  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const query = searchQuery.toLowerCase();
    return plans.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }, [plans, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => calculateBillingStats(plans), [plans]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API refresh - in production, fetch from backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Handle subscription
  const handleSubscribe = useCallback(async (plan: PaymentPlan) => {
    try {
      const canOpen = await Linking.canOpenURL(plan.link);
      if (canOpen) {
        Alert.alert(
          'Opening M-Pesa',
          `You'll be redirected to pay ${plan.amount} for ${plan.name}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => Linking.openURL(plan.link),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Unable to open payment link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open M-Pesa payment');
    }
  }, []);

  const bgColor = isDark ? '#0f172a' : '#f5f5f5';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDark ? '#94a3b8' : '#666666';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>M-Pesa Billing</Text>
          <Text style={styles.headerSubtitle}>Choose your subscription plan</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search payment plans..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Payment Plans List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={MPESA_GREEN}
            colors={[MPESA_GREEN]}
          />
        }
      >
        {filteredPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={48} color={subTextColor} />
            <Text style={[styles.emptyText, { color: subTextColor }]}>
              No payment plans found
            </Text>
          </View>
        ) : (
          filteredPlans.map((plan) => (
            <PaymentCard
              key={plan.id}
              plan={plan}
              onSubscribe={handleSubscribe}
              isDark={isDark}
            />
          ))
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Stats Summary Footer */}
      <View style={[styles.statsFooter, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <CreditCard size={18} color={MPESA_GREEN} />
          </View>
          <View>
            <Text style={[styles.statValue, { color: MPESA_GREEN }]}>
              {stats.totalPlans}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Total Plans
            </Text>
          </View>
        </View>

        <View style={[styles.statDivider, { backgroundColor: borderColor }]} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <TrendingUp size={18} color={MPESA_GREEN} />
          </View>
          <View>
            <Text style={[styles.statValue, { color: MPESA_GREEN }]}>
              {stats.formattedCollected}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Collected
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: MPESA_GREEN,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#cccccc',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
});
