/**
 * SubscriptionStatus - Display current subscription status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SubscriptionState } from '@/services/subscription';
import type { BypassStatus } from '@/services/devBypass';

interface SubscriptionStatusProps {
  state: SubscriptionState;
  statusColor: string;
  statusText: string;
  remainingText: string;
  urgencyLevel?: 'critical' | 'warning' | 'normal';
  isGracePeriod?: boolean;
  graceDaysRemaining?: number;
  isTrial?: boolean;
  bypassInfo?: BypassStatus | null;
}

export function SubscriptionStatus({
  state,
  statusColor,
  statusText,
  remainingText,
  urgencyLevel = 'normal',
  isGracePeriod = false,
  graceDaysRemaining = 0,
  isTrial = false,
  bypassInfo = null,
}: SubscriptionStatusProps) {
  if (state.status === 'none' && !bypassInfo?.active) {
    return null;
  }

  // Determine color based on urgency level
  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case 'critical': return '#ef4444'; // red
      case 'warning': return '#f59e0b'; // yellow
      default: return statusColor;
    }
  };

  const urgencyColor = getUrgencyColor();

  return (
    <View style={styles.container}>
      {/* Developer/Admin Bypass Badge */}
      {bypassInfo?.active && (
        <View style={[styles.bypassBadge, { backgroundColor: '#7c3aed' }]}>
          <Text style={styles.bypassText}>
            🔓 {bypassInfo.source === 'force_flag' ? 'Force Bypass' :
              bypassInfo.source === 'dev_override' ? 'Dev Override' :
                'Admin Unlock'}
          </Text>
        </View>
      )}

      {/* Status Badge with Urgency Color */}
      <View style={[styles.statusBadge, { backgroundColor: urgencyColor }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {/* Grace Period Indicator */}
      {isGracePeriod && (
        <View style={styles.graceBadge}>
          <Text style={styles.graceText}>
            ⏳ Grace Period: {graceDaysRemaining} day{graceDaysRemaining !== 1 ? 's' : ''} remaining
          </Text>
        </View>
      )}

      {/* Subscription Details */}
      {state.expiryDate && !bypassInfo?.active && (
        <View style={styles.details}>
          {/* Trial vs Subscription Label */}
          <Text style={[styles.remainingText, { color: urgencyColor }]}>
            {isTrial ? '🎁 ' : '💎 '}{remainingText}
          </Text>
          <Text style={styles.expiryText}>
            Expires: {state.expiryDate.toLocaleDateString()}
          </Text>
        </View>
      )}

      {state.status === 'expiring' && !isGracePeriod && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Your subscription is expiring soon. Renew now to continue access.
          </Text>
        </View>
      )}

      {state.status === 'expired' && !isGracePeriod && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            ❌ Your subscription has expired. Subscribe to continue using the app.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  bypassBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  bypassText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  graceBadge: {
    backgroundColor: '#422006',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  graceText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  details: {
    marginBottom: 8,
  },
  remainingText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expiryText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  warningBox: {
    backgroundColor: '#422006',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
});

export default SubscriptionStatus;
