// -------------------------------------------------------------
// 💳 PaymentCard Component - Individual Payment Plan Card
// -------------------------------------------------------------

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { CreditCard, Check, Star } from 'lucide-react-native';
import type { PaymentPlan } from '@/types/billing';

interface PaymentCardProps {
  plan: PaymentPlan;
  onSubscribe?: (plan: PaymentPlan) => void;
  isDark?: boolean;
}

const MPESA_GREEN = '#006400';
const MPESA_LIGHT_GREEN = '#00A300';

function PaymentCard({ plan, onSubscribe, isDark = false }: PaymentCardProps) {
  const handleSubscribe = async () => {
    if (onSubscribe) {
      onSubscribe(plan);
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(plan.link);
      if (canOpen) {
        await Linking.openURL(plan.link);
      } else {
        Alert.alert('Error', 'Unable to open payment link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open M-Pesa payment');
    }
  };

  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDark ? '#94a3b8' : '#666666';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Star size={12} color="#fff" fill="#fff" />
          <Text style={styles.popularText}>Popular</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <CreditCard size={24} color={MPESA_GREEN} />
        </View>

        <View style={styles.planInfo}>
          <Text style={[styles.planName, { color: textColor }]}>{plan.name}</Text>
          <Text style={[styles.description, { color: subTextColor }]}>
            {plan.description}
          </Text>
        </View>

        <Text style={styles.amount}>{plan.amount}</Text>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: plan.status === 'Active' ? MPESA_GREEN : '#9ca3af' },
          ]}
        >
          <Text style={styles.statusText}>{plan.status}</Text>
        </View>

        <Text style={[styles.statsText, { color: subTextColor }]}>
          Payments: {plan.payments}
        </Text>

        <Text style={[styles.statsText, { color: subTextColor }]}>
          Collected: {plan.collected}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={handleSubscribe}
        activeOpacity={0.8}
      >
        <CreditCard size={18} color="#fff" />
        <Text style={styles.subscribeText}>Subscribe Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
    marginLeft: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
    color: MPESA_GREEN,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsText: {
    fontSize: 13,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MPESA_GREEN,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  subscribeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default memo(PaymentCard);
