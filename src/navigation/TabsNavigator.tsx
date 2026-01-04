import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutGrid,
  MessageSquare,
  Users,
  Briefcase,
  Settings,
} from 'lucide-react-native';

import ProtectedRoute from '../components/ProtectedRoute';
import { useThemeSettings } from '@/theme/ThemeProvider';
import { Card } from '@/components/ui';

// Screens
import DashboardScreen from '../screens/main/dashboard';
import { InboxScreen } from '../screens/messaging';
import CustomerDatabaseScreen from '../screens/main/customer-database';
import ToolsScreen from '../screens/main/tools';
import SettingsScreen from '../screens/main/settings';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  const { colors } = useThemeSettings();

  return (
    <ProtectedRoute>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.subText,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: 8,
            height: 65,
            borderTopWidth: 1,
            ...colors.shadow.lg,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <LayoutGrid
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Messages"
          component={InboxScreen}
          options={{
            title: 'Inbox',
            tabBarIcon: ({ color, size, focused }) => (
              <MessageSquare
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Contacts"
          component={CustomerDatabaseScreen}
          options={{
            title: 'Contacts',
            tabBarIcon: ({ color, size, focused }) => (
              <Users
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Tools"
          component={ToolsScreen}
          options={{
            title: 'Tools',
            tabBarIcon: ({ color, size, focused }) => (
              <Briefcase
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size, focused }) => (
              <Settings
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </ProtectedRoute>
  );
}
