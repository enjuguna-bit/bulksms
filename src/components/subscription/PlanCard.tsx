/**
 * PlanCard - Subscription plan display card
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { SubscriptionPlan } from '@/services/subscription';

interface PlanCardProps {
  plan: SubscriptionPlan;
  selected?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  disabled?: boolean;
}

export function PlanCard({ plan, selected, onSelect, disabled }: PlanCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const dailyCost = Math.round(plan.amount / plan.days);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          selected && styles.cardSelected,
          plan.recommended && styles.cardRecommended,
          disabled && styles.cardDisabled,
        ]}
        onPress={() => onSelect(plan)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {plan.badge && (
          <View style={[styles.badge, plan.recommended && styles.badgeRecommended]}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={[styles.name, selected && styles.nameSelected]}>
            {plan.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.currency, selected && styles.currencySelected]}>
              KES
            </Text>
            <Text style={[styles.price, selected && styles.priceSelected]}>
              {plan.amount.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, selected && styles.descriptionSelected]}>
          {plan.description}
        </Text>

        <View style={styles.features}>
          {plan.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={[styles.featureText, selected && styles.featureTextSelected]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.dailyCost, selected && styles.dailyCostSelected]}>
            KES {dailyCost}/day
          </Text>
          {selected && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1e3a2f',
  },
  cardRecommended: {
    borderColor: '#f59e0b',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeRecommended: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  nameSelected: {
    color: '#22c55e',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 4,
  },
  currencySelected: {
    color: '#86efac',
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  priceSelected: {
    color: '#22c55e',
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  descriptionSelected: {
    color: '#a7f3d0',
  },
  features: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureCheck: {
    color: '#22c55e',
    fontSize: 14,
    marginRight: 8,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  featureTextSelected: {
    color: '#e2e8f0',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  dailyCost: {
    fontSize: 12,
    color: '#64748b',
  },
  dailyCostSelected: {
    color: '#86efac',
  },
  selectedIndicator: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PlanCard;
