// ============================================================================
// 👥 ChatHeader — Contact resolution & Avatars
// ============================================================================
import React, { memo, useEffect, useState } from "react";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false
};
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { ArrowLeft, Phone, Video, MoreVertical, Search } from "lucide-react-native"; // Replaced SearchIcon with Search
import { useNavigation } from "@react-navigation/native";
import { Linking } from 'react-native';
// import * as Haptics from 'expo-haptics'; // Removed, using native module
import { useThemeSettings } from "@/theme/ThemeProvider";
import { getContactName, getAvatarColor, getInitials } from "@/utils/contactUtils";
import type { MessageThread } from "@/db/repositories/threads";
import { PermissionsAndroid } from 'react-native';
import { SimSelectionDialog } from "@/components/SimSelectionDialog";
import { NativeModules } from 'react-native';

const { CallManagerModule } = NativeModules as {
  CallManagerModule: {
    hasMultipleSims: () => Promise<boolean>;
    getAvailableSims: () => Promise<Array<{
      subscriptionId: number;
      simSlotIndex: number;
      displayName: string;
      carrierName: string;
      countryIso: string;
      number: string;
      mcc: number;
      mnc: number;
    }>>;
    makeCall: (phoneNumber: string, subscriptionId: number | null) => Promise<{ success: boolean; message: string }>;
    canMakeCalls: () => Promise<boolean>;
  };
};

interface ChatHeaderProps {
  address: string;
  thread?: MessageThread | null;
  onSearchToggle: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const ChatHeader = memo(({ address, thread, onSearchToggle }: ChatHeaderProps) => {
  const navigation = useNavigation();
  const { colors } = useThemeSettings();
  const [contactName, setContactName] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [showSimDialog, setShowSimDialog] = useState(false);

  // Animation values
  const callBtnScale = useSharedValue(1);
  const callBtnOpacity = useSharedValue(1);

  const callBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: callBtnScale.value }],
    opacity: callBtnOpacity.value
  }));

  useEffect(() => {
    // Resolve contact name (sync from cache)
    const name = getContactName(address);
    setContactName(name || address);
  }, [address]);



  // ... inside component ...

  const handleCallPressIn = () => {
    callBtnScale.value = withSpring(0.9);
    ReactNativeHapticFeedback.trigger("selection", HAPTIC_OPTIONS);
  };

  const handleCallPressOut = () => {
    callBtnScale.value = withSpring(1);
  };

  const handleCall = async () => {
    try {
      setIsCalling(true);
      callBtnOpacity.value = withSpring(0.7);

      // Premium haptic feedback sequence
      ReactNativeHapticFeedback.trigger("impactHeavy", HAPTIC_OPTIONS);
      await new Promise(resolve => setTimeout(resolve, 50));
      ReactNativeHapticFeedback.trigger("impactLight", HAPTIC_OPTIONS);

      // Check and request CALL_PHONE permission for Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          {
            title: 'Phone Call Permission',
            message: 'BulkSMS needs access to make phone calls',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny'
          }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          ReactNativeHapticFeedback.trigger("notificationError", HAPTIC_OPTIONS);
          Alert.alert(
            'Permission Required',
            'Phone call permission is required to make calls'
          );
          return;
        }
      }

      // Check if device has multiple SIMs
      const hasMultipleSims = await CallManagerModule.hasMultipleSims();

      if (hasMultipleSims) {
        // Show SIM selection dialog
        setShowSimDialog(true);
      } else {
        // Direct call with default SIM
        await makeCallWithSim(null);
      }

    } catch (error) {
      console.error("Call setup failed:", error);
      ReactNativeHapticFeedback.trigger("notificationError", HAPTIC_OPTIONS);
      Alert.alert(
        "Call Failed",
        "Could not initiate call. Please check your device settings."
      );
    } finally {
      callBtnOpacity.value = withSpring(1);
      setIsCalling(false);
    }
  };

  const makeCallWithSim = async (subscriptionId: number | null) => {
    try {
      const result = await CallManagerModule.makeCall(address, subscriptionId);

      if (result.success) {
        ReactNativeHapticFeedback.trigger("notificationSuccess", HAPTIC_OPTIONS);
      } else {
        throw new Error(result.message || "Call failed");
      }
    } catch (error) {
      console.error("Call failed:", error);
      ReactNativeHapticFeedback.trigger("notificationError", HAPTIC_OPTIONS);
      Alert.alert(
        "Call Failed",
        "Could not initiate call. Please check your device settings."
      );
    }
  };

  const handleSimSelected = async (subscriptionId: number | null) => {
    setShowSimDialog(false);
    await makeCallWithSim(subscriptionId);
  };

  const handleSimDialogCancel = () => {
    setShowSimDialog(false);
  };

  // Fallback if contact resolution is still running or failed
  const displayName = contactName || address;
  const avatarColor = getAvatarColor(address);
  const initials = getInitials(displayName);

  return (
    <>
      <View style={[styles.container, { backgroundColor: '#005c4b' }]}>
        <View style={styles.leftRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ArrowLeft color="#fff" size={24} />

            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.info}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Open Contact Info
            }}
          >
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.status} numberOfLines={1}>
              {/* Simple status logic for now */}
              Tap for info
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Video color="#fff" size={24} />
          </TouchableOpacity>

          <AnimatedTouchable
            style={[styles.actionBtn, callBtnStyle]}
            onPress={handleCall}
            onPressIn={handleCallPressIn}
            onPressOut={handleCallPressOut}
            disabled={isCalling}
          >
            {isCalling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Phone color="#fff" size={22} />
            )}
          </AnimatedTouchable>

          <TouchableOpacity style={styles.actionBtn} onPress={onSearchToggle}>
            <Search color="#fff" size={22} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <MoreVertical color="#fff" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <SimSelectionDialog
        visible={showSimDialog}
        onSelect={handleSimSelected}
        onCancel={handleSimDialogCancel}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10, // Increased vertical padding
    paddingHorizontal: 8, // Increased horizontal padding
    elevation: 4,
    shadowOpacity: 0.2, // iOS shadow
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 20, // Rounded touch target
    padding: 4,
  },
  avatar: {
    width: 36, // Smaller avatar
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 4, // Added margin
  },
  name: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  status: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8, // Consistent padding
    marginLeft: 2,
  },
});

export default ChatHeader;
