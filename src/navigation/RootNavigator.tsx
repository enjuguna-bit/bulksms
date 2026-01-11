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
import { SubscriptionScreen } from '../screens/subscription';
import PaymentDashboardScreen from '../screens/paywall/payment-dashboard';

// NEW — Messaging System
import ThreadsScreen from "../screens/chat/ThreadsScreen";
import { ChatScreenNew } from "../screens/messaging";

// Tabs
import TabsNavigator from './TabsNavigator';

// Detached screens (formerly tabs)
import BulkProScreen from "../screens/main/bulk-pro";
import SendSmsScreen from "../screens/main/send-sms";
import TransactionsScreen from "../screens/main/transactions";
import InboxScreen from "../screens/main/inbox";
import CustomerDatabaseScreen from "../screens/main/customer-database";
import ContactPickerScreen from "../screens/contacts/ContactPickerScreen";
import SplitContactsScreen from '../screens/contacts/SplitContactsScreen';

// Campaigns logic
import CampaignListScreen from '../screens/marketing/CampaignListScreen';
import CampaignDetailScreen from '../screens/marketing/CampaignDetailScreen';
import CreateCampaignScreen from '../screens/marketing/CreateCampaignScreen';

// Settings
import BlacklistScreen from '../screens/settings/BlacklistScreen';
import { AiSettingsScreen } from '../screens/settings/AiSettingsScreen';

// Debug screen
import DebugScreen from "../screens/debug/DebugScreen";

import { useAppLock } from "@/hooks/useAppLock";
import AppLockScreen from "@/screens/AppLockScreen";

// Tools
import TransactionCleanerScreen from "../screens/tools/TransactionCleanerScreen";
import DataExportScreen from "../screens/tools/DataExportScreen";
import SystemHealthScreen from "../screens/tools/SystemHealthScreen";
import MpesaParserScreen from "../screens/tools/MpesaParserScreen";
import SmsSchedulerScreen from "../screens/tools/SmsScheduler";
import InboxScannerScreen from '../screens/tools/InboxScannerScreen';
import LipanaSettingsScreen from "../screens/settings/LipanaSettingsScreen";
import BillingScreen from "../screens/billing/BillingScreen";

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
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PaymentDashboard" component={PaymentDashboardScreen} />

      {/* NEW MESSAGING SCREENS */}
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreenNew}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InboxScanner"
        component={InboxScannerScreen}
        options={{ headerShown: true, title: "Financial Scanner" }}
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
      <Stack.Screen
        name="ContactPicker"
        component={ContactPickerScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.mode === 'multiple' ? 'Select Contacts' : 'New Chat',
        })}
      />
      <Stack.Screen
        name="SplitContacts"
        component={SplitContactsScreen}
        options={{ headerShown: true, title: 'All Contacts' }}
      />

      <Stack.Screen
        name="DataExport"
        component={DataExportScreen}
        options={{ headerShown: true, title: "Export Data" }}
      />
      <Stack.Screen
        name="TransactionCleaner"
        component={TransactionCleanerScreen}
        options={{ headerShown: true, title: "Clean Transactions" }}
      />
      <Stack.Screen
        name="SystemHealth"
        component={SystemHealthScreen}
        options={{ headerShown: true, title: "System Health" }}
      />
      <Stack.Screen
        name="MpesaParserScreen"
        component={MpesaParserScreen}
        options={{ headerShown: true, title: "M-Pesa Statement Parser" }}
      />
      <Stack.Screen
        name="SmsScheduler"
        component={SmsSchedulerScreen}
        options={{ headerShown: true, title: "Schedule SMS" }}
      />

      {/* Campaign Screens */}
      <Stack.Screen
        name="CampaignList"
        component={CampaignListScreen}
        options={{ headerShown: true, title: "Campaigns" }}
      />
      <Stack.Screen
        name="CampaignDetail"
        component={CampaignDetailScreen}
        options={{ headerShown: true, title: "Campaign Details" }}
      />
      <Stack.Screen
        name="CreateCampaign"
        component={CreateCampaignScreen}
        options={{ headerShown: true, title: "New Campaign" }}
      />

      <Stack.Screen
        name="Blacklist"
        component={BlacklistScreen}
        options={{ headerShown: true, title: "Blacklist / Opt-Outs" }}
      />

      <Stack.Screen
        name="AiSettings"
        component={AiSettingsScreen}
        options={{ headerShown: false }}
      />

      {/* Debug Screen - Only accessible in dev mode */}
      {__DEV__ && (
        <Stack.Screen
          name="LipanaSettings"
          component={LipanaSettingsScreen}
          options={{ headerShown: false }}
        />
      )}
      {__DEV__ && (
        <Stack.Screen
          name="Debug"
          component={DebugScreen}
          options={{ headerShown: true, title: "Debug" }}
        />
      )}

      {/* Billing Screen */}
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen name="Tabs" component={TabsNavigator} />
    </Stack.Navigator>
  );
}