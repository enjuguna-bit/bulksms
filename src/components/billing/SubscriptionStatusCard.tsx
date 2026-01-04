/**
 * SubscriptionStatusCard.tsx - Premium subscription status display
 * 
 * Shows current subscription status with:
 * - Visual status indicator
 * - Days/hours remaining
 * - Grace period warning
 * - Renewal reminders
 * - Quick action buttons
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { 
  Crown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw 
} from 'lucide-react-native';
import { useSubscription } from '@/hooks/useSubscription';
import { kenyaColors } from '@/theme/kenyaTheme';

interface SubscriptionStatusCardProps {
  onRenewPress?: () => void;
  onUpgradePress?: () => void;
  compact?: boolean;
}

export function SubscriptionStatusCard({
  onRenewPress,
  onUpgradePress,
  compact = false,
}: SubscriptionStatusCardProps) {
  const {
    state,
    currentPlan,
    statusText,
    statusColor,
    remainingTimeText,
    isActive,
    isExpiring,
    isInGrace,
    isExpired,
    expiryDate,
    refresh,
    loading,
  } = useSubscription();

  // Status icon
  const StatusIcon = () => {
    if (isActive && !isExpiring) {
      return <CheckCircle size={24} color={statusColor} />;
    }
    if (isExpiring) {
      return <Clock size={24} color={statusColor} />;
    }
    if (isInGrace) {
      return <AlertTriangle size={24} color={statusColor} />;
    }
    return <XCircle size={24} color={statusColor} />;
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: statusColor }]}>
        <View style={styles.compactLeft}>
          <StatusIcon />
          <View style={styles.compactTextContainer}>
            <Text style={styles.compactStatus}>{statusText}</Text>
            <Text style={styles.compactRemaining}>{remainingTimeText}</Text>
          </View>
        </View>
        {(isExpiring || isInGrace || isExpired) && onRenewPress && (
          <TouchableOpacity 
            style={[styles.compactButton, { backgroundColor: statusColor }]}
            onPress={onRenewPress}
          >
            <Text style={styles.compactButtonText}>Renew</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Crown size={20} color={kenyaColors.safaricomGreen} />
          <Text style={styles.headerTitle}>Subscription Status</Text>
        </View>
        <TouchableOpacity onPress={refresh} disabled={loading}>
          <RefreshCw 
            size={18} 
            color="#666" 
            style={loading ? styles.spinning : undefined}
          />
        </TouchableOpacity>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
        <StatusIcon />
        <View style={styles.statusTextContainer}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
          {currentPlan && (
            <Text style={styles.planName}>{currentPlan.name} Plan</Text>
          )}
        </View>
      </View>

      {/* Time Remaining */}
      <View style={styles.timeSection}>
        <Text style={styles.timeLabel}>Time Remaining</Text>
        <Text style={styles.timeValue}>{remainingTimeText}</Text>
        {expiryDate && (
          <Text style={styles.expiryDate}>
            Expires: {expiryDate.toLocaleDateString('en-KE', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        )}
      </View>

      {/* Warning for expiring/grace */}
      {isExpiring && (
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            Your subscription is expiring soon. Renew now to avoid interruption.
          </Text>
        </View>
      )}

      {isInGrace && (
        <View style={[styles.warningBox, styles.graceWarning]}>
          <AlertTriangle size={16} color="#ef4444" />
          <Text style={[styles.warningText, { color: '#ef4444' }]}>
            Grace period active! Renew within {state.graceDaysRemaining} days to keep access.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {(isExpiring || isInGrace || isExpired) && onRenewPress && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.renewButton]}
            onPress={onRenewPress}
          >
            <Text style={styles.renewButtonText}>Renew Now</Text>
          </TouchableOpacity>
        )}
        
        {isActive && !isExpiring && onUpgradePress && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.upgradeButton]}
            onPress={onUpgradePress}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  spinning: {
    opacity: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  planName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timeSection: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  expiryDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  graceWarning: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  renewButton: {
    backgroundColor: kenyaColors.safaricomGreen,
  },
  renewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  upgradeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactTextContainer: {
    gap: 2,
  },
  compactStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  compactRemaining: {
    fontSize: 12,
    color: '#666',
  },
  compactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  compactButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SubscriptionStatusCard;
