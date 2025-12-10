import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Config
import { CONFIG } from "@/constants/config";

const DEVELOPER_BYPASS = CONFIG.DEVELOPER_BYPASS;

// Types
import { RootStackParamList } from '@/types';

// Screens
import StartupScreen from '../screens/Startup';
import OnboardingScreen from '../screens/auth/onboarding';
import ExpiredScreen from '../screens/paywall/expired';
import PaywallScreen from '../screens/paywall/paywall';
import PaymentDashboardScreen from '../screens/paywall/payment-dashboard';

// NEW — Messaging System
import ThreadsScreen from "../screens/chat/ThreadsScreen";
import ChatScreen from "../screens/chat/ChatScreen";

// Tabs
import TabsNavigator from './TabsNavigator';

// Detached screens (formerly tabs)
import BulkProScreen from "../screens/main/bulk-pro";
import SendSmsScreen from "../screens/main/send-sms";
import TransactionsScreen from "../screens/main/transactions";
import InboxScreen from "../screens/main/inbox";
import CustomerDatabaseScreen from "../screens/main/customer-database";

// Debug screen
import DebugScreen from "../screens/debug/DebugScreen";

import { useAppLock } from "@/hooks/useAppLock";
import AppLockScreen from "@/screens/AppLockScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // Setup handled by UnifiedStartupGate
  const { isLocked, unlock, isEnabled } = useAppLock();

  if (isEnabled && isLocked) {
    return <AppLockScreen onUnlock={unlock} />;
  }

  const initialRoute = DEVELOPER_BYPASS ? 'Tabs' : 'Startup';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Startup" component={StartupScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Expired" component={ExpiredScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="PaymentDashboard" component={PaymentDashboardScreen} />

      {/* NEW MESSAGING SCREENS */}
      <Stack.Screen
        name="ThreadsScreen"
        component={ThreadsScreen}
        options={{ headerShown: true, title: "Messages" }}
      />

      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={({ route }) => {
          const params = route.params;
          return {
            headerShown: true,
            title: params?.name ?? params?.address ?? "Chat",
            headerBackTitle: "Back",
          };
        }}
      />

      {/* Detached Tools Screens */}
      <Stack.Screen
        name="BulkPro"
        component={BulkProScreen}
        options={{ headerShown: true, title: "Bulk SMS" }}
      />
      <Stack.Screen
        name="SendSms"
        component={SendSmsScreen}
        options={{ headerShown: true, title: "Send SMS" }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ headerShown: true, title: "Transactions" }}
      />
      <Stack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ headerShown: true, title: "Inbox" }}
      />
      <Stack.Screen
        name="CustomerDatabase"
        component={CustomerDatabaseScreen}
        options={{ headerShown: true, title: "Contacts" }}
      />

      {/* Debug Screen - Only accessible in dev mode */}
      {__DEV__ && (
        <Stack.Screen
          name="Debug"
          component={DebugScreen}
          options={{ headerShown: true, title: "Debug" }}
        />
      )}

      <Stack.Screen name="Tabs" component={TabsNavigator} />
    </Stack.Navigator>
  );
}