/**
 * SubscriptionScreen - Main subscription/paywall screen with Lipana payments
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubscriptionState } from '@/hooks/useSubscriptionState';
import { PlanCard, SubscriptionStatus } from '@/components/subscription';
import { getDisplayPlans, type SubscriptionPlan, type PlanId } from '@/services/subscription';
import { smsListener } from '@/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_TAP_THRESHOLD = 5;
const DEV_TAP_WINDOW_MS = 3000;

const DEV_BYPASS_KEY = 'DEV_BYPASS_OVERRIDE';

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const {
    state,
    loading,
    hasAccess,
    statusText,
    statusColor,
    remainingText,
    isTrial,
    isGracePeriod,
    graceDaysRemaining,
    urgencyLevel,
    bypassInfo,
    refresh,
    openPayment,
    activateFromPayment,
  } = useSubscriptionState();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Dev bypass state
  const [devBypass, setDevBypass] = useState(false);
  const tapCountRef = useRef(0);
  const firstTapRef = useRef<number | null>(null);
  const bypassActivatedRef = useRef(false);

  const plans = getDisplayPlans();

  // Set default selected plan to recommended
  useEffect(() => {
    const recommended = plans.find(p => p.recommended);
    if (recommended && !selectedPlan) {
      setSelectedPlan(recommended);
    }
  }, [plans, selectedPlan]);

  // Check dev bypass on mount
  useEffect(() => {
    AsyncStorage.getItem(DEV_BYPASS_KEY).then(val => setDevBypass(val === 'true'));
  }, []);

  // Redirect if has access
  useEffect(() => {
    if (hasAccess || devBypass) {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    }
  }, [hasAccess, devBypass, navigation]);

  // SMS listener for payment detection
  useEffect(() => {
    if (hasAccess || devBypass) return;

    console.log('[SubscriptionScreen] Setting up SMS listener...');

    const subscription = smsListener.addListener(
      async (payload: { body: string; timestamp: number }) => {
        console.log('[SubscriptionScreen] SMS received');

        // Try to detect M-PESA confirmation
        const amountMatch = payload.body.match(/Ksh([\d,]+\.?\d*)/i);
        const codeMatch = payload.body.match(/([A-Z0-9]{10})/);

        if (amountMatch && codeMatch) {
          const amount = parseFloat(amountMatch[1].replace(',', ''));
          const code = codeMatch[1];

          console.log(`[SubscriptionScreen] Detected payment: KES ${amount}, Code: ${code}`);

          const result = await activateFromPayment(amount, code, 'mpesa');
          if (result.success) {
            setMessage('✅ Payment detected! Subscription activated.');
            setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] }), 2000);
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [hasAccess, devBypass, activateFromPayment, navigation]);

  // Refresh on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const handleSelectPlan = useCallback((plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  }, []);

  const handlePayment = useCallback(async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    try {
      setPaymentLoading(true);
      setMessage('Opening payment page...');

      const success = await openPayment(selectedPlan.id);

      if (success) {
        setMessage('Payment page opened. Complete payment and return here.');
      } else {
        setMessage('❌ Failed to open payment page');
        Alert.alert('Error', 'Could not open payment link. Please try again.');
      }
    } catch (error) {
      console.error('[SubscriptionScreen] Payment error:', error);
      setMessage('❌ Payment failed');
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }, [selectedPlan, openPayment]);

  // Hidden dev bypass via 5 taps
  const handleTitleTap = useCallback(() => {
    const now = Date.now();

    if (!firstTapRef.current || now - firstTapRef.current > DEV_TAP_WINDOW_MS) {
      firstTapRef.current = now;
      tapCountRef.current = 0;
    }

    tapCountRef.current += 1;

    if (
      tapCountRef.current >= DEV_TAP_THRESHOLD &&
      now - firstTapRef.current <= DEV_TAP_WINDOW_MS &&
      !bypassActivatedRef.current
    ) {
      tapCountRef.current = 0;
      firstTapRef.current = null;
      bypassActivatedRef.current = true;

      AsyncStorage.setItem(DEV_BYPASS_KEY, 'true')
        .then(() => {
          setDevBypass(true);
          Alert.alert('Dev Mode', 'Developer bypass enabled');
          navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
        })
        .catch(() => {
          Alert.alert('Error', 'Failed to enable bypass');
        });
    }
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
        <Text style={styles.title}>Choose Your Plan</Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>
        Get full access to all features with M-PESA payment
      </Text>

      {/* Current Status */}
      <SubscriptionStatus
        state={state}
        statusColor={statusColor}
        statusText={statusText}
        remainingText={remainingText}
        urgencyLevel={urgencyLevel}
        isGracePeriod={isGracePeriod}
        graceDaysRemaining={graceDaysRemaining}
        isTrial={isTrial}
        bypassInfo={bypassInfo}
      />

      {/* Plan Cards */}
      <View style={styles.plansContainer}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan?.id === plan.id}
            onSelect={handleSelectPlan}
            disabled={paymentLoading}
          />
        ))}
      </View>

      {/* Payment Button */}
      <TouchableOpacity
        style={[
          styles.payButton,
          (!selectedPlan || paymentLoading) && styles.payButtonDisabled,
        ]}
        onPress={handlePayment}
        disabled={!selectedPlan || paymentLoading}
      >
        {paymentLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>
            Pay with M-PESA{selectedPlan ? ` - KES ${selectedPlan.amount.toLocaleString()}` : ''}
          </Text>
        )}
      </TouchableOpacity>

      {/* Message */}
      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Text style={styles.howItWorksTitle}>How it works:</Text>
        <Text style={styles.howItWorksStep}>1. Select your preferred plan above</Text>
        <Text style={styles.howItWorksStep}>2. Click "Pay with M-PESA" button</Text>
        <Text style={styles.howItWorksStep}>3. Enter your M-PESA number on the payment page</Text>
        <Text style={styles.howItWorksStep}>4. Confirm the STK push on your phone</Text>
        <Text style={styles.howItWorksStep}>5. Return here - your subscription activates automatically!</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('Tabs')}>
          <Text style={styles.footerLink}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity onPress={() => refresh()}>
          <Text style={styles.footerLink}>Support</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.copyright}>
        🔐 Secure payment via Lipana M-PESA{'\n'}
        © {new Date().getFullYear()} Bulk SMS Pro
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  plansContainer: {
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonDisabled: {
    backgroundColor: '#334155',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  messageBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center',
  },
  howItWorks: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  howItWorksStep: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
    paddingLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLink: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  footerDivider: {
    color: '#64748b',
    marginHorizontal: 12,
  },
  copyright: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
