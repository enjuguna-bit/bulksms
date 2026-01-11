// -------------------------------------------------------------
// ⚙️ Settings Screen — Pro Edition (Upgraded v3.1, Strict TS)
// -------------------------------------------------------------
// Navigation: now using useSafeRouter() instead of useNavigation()
// -------------------------------------------------------------

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  LayoutAnimation,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
  Linking,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronDown,
  ChevronUp,
  Database,
  Info,
  Palette,
  RotateCcw,
  Shield,
  Smartphone,
  Bug,
  Brain,
} from "lucide-react-native";

// 🔁 NEW: React Navigation → your safe navigation wrapper
import { useSafeRouter } from "@/hooks/useSafeRouter";

// Internal modules
import { useThemeSettings } from "@/theme/ThemeProvider";
import { useBilling } from "@/providers/BillingProvider";
import { isDefaultSmsApp, promptDefaultSmsApp } from "@/services/defaultSmsRole";
import { BillingDiagnosticsBanner } from "@/components/BillingDiagnosticsBanner";

import { useAppLock } from "@/hooks/useAppLock";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  primary: "#2563eb",
  danger: "#dc2626",
  success: "#16a34a",
  bgLight: "#f1f5f9",
  borderLight: "#e2e8f0",
} as const;

type ExpandKey =
  | "theme"
  | "security"
  | "backup"
  | "permissions"
  | "about"
  | "debug"
  | null;

// -------------------------------------------------------------
// Section Component
// -------------------------------------------------------------
type SectionProps = {
  icon: React.ReactNode;
  title: string;
  name: NonNullable<ExpandKey>;
  expanded: ExpandKey;
  onToggle: (key: NonNullable<ExpandKey>) => void;
  themeMode: string;
  children: React.ReactNode;
};

const Section = memo(function Section({
  icon,
  title,
  name,
  expanded,
  onToggle,
  themeMode,
  children,
}: SectionProps) {
  const isDark = themeMode === "dark";
  return (
    <View style={[styles.card, getCardStyle(themeMode)]}>
      <Pressable
        onPress={() => onToggle(name)}
        style={[styles.sectionHeader, isDark && { backgroundColor: "#1e293b" }]}
      >
        <View style={styles.rowCenter}>
          {icon}
          <Text style={[styles.sectionHeaderText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>
            {title}
          </Text>
        </View>

        {expanded === name ? (
          <ChevronUp size={20} color={COLORS.primary} />
        ) : (
          <ChevronDown size={20} color={COLORS.primary} />
        )}
      </Pressable>

      {expanded === name && (
        <View style={[styles.sectionBody, isDark && { borderTopColor: "#334155" }]}>
          {children}
        </View>
      )}
    </View>
  );
});

// -------------------------------------------------------------
// ThemeOption Component
// -------------------------------------------------------------
type ThemeOptionProps = {
  label: "system" | "light" | "dark";
  current: string;
  setMode: (m: "system" | "light" | "dark") => void;
};

type ThemeOptionPropsExtended = ThemeOptionProps & { isDark?: boolean };

const ThemeOption = memo(function ThemeOption({
  label,
  current,
  setMode,
  isDark,
}: ThemeOptionPropsExtended) {
  const selected = current === label;
  const onPress = useCallback(() => setMode(label), [label, setMode]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.themeButton,
        {
          borderColor: selected ? COLORS.primary : (isDark ? "#475569" : "#ccc"),
          backgroundColor: selected ? "#e0e7ff" : "transparent",
        },
      ]}
      android_ripple={{ color: "#e5e7eb" }}
    >
      <Text style={{ fontWeight: selected ? "700" : "400", color: isDark ? "#f1f5f9" : "#1e293b" }}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
});

// -------------------------------------------------------------
// AppLockSettings Component
// -------------------------------------------------------------
const AppLockSettings = memo(function AppLockSettings() {
  const { isSupported, isEnabled, setLockEnabled, biometryType } = useAppLock();

  if (!isSupported) {
    return (
      <Text style={{ color: "#64748b" }}>
        Biometrics not available on this device.
      </Text>
    );
  }

  return (
    <View style={styles.switchRow}>
      <View style={styles.rowCenter}>
        <Shield size={18} color={COLORS.primary} />
        <Text>
          Enable {biometryType ? biometryType.toUpperCase() : "App Lock"}
        </Text>
      </View>
      <Switch value={isEnabled} onValueChange={(val) => void setLockEnabled(val)} />
    </View>
  );
});

// -------------------------------------------------------------
// MAIN SETTINGS SCREEN
// -------------------------------------------------------------
export default function SettingsScreen(): JSX.Element {
  const router = useSafeRouter(); // 🔁 NEW navigation hook

  const {
    mode,
    setMode,
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
    theme,
  } = useThemeSettings();

  // Only use unlockAdmin from billing - subscription UI removed for now
  const { unlockAdmin } = useBilling();

  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [isDefaultSms, setIsDefaultSms] = useState(false);
  // Admin section
  const [adminVisible, setAdminVisible] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  // 🔐 Developer bypass - 5 taps within 3 seconds
  const tapCountRef = useRef(0);
  const firstTapRef = useRef<number | null>(null);
  const DEV_TAP_THRESHOLD = 5;
  const DEV_TAP_WINDOW_MS = 3000;

  const APP_VERSION = "1.1.1";

  // Load defaults on mount
  useEffect(() => {
    void (async () => {
      if (Platform.OS === "android") {
        const def = await isDefaultSmsApp();
        setIsDefaultSms(def);
      }
    })();
  }, []);

  const onToggle = useCallback((key: NonNullable<ExpandKey>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  // -------------------------------------------------------------
  // SMS Role
  // -------------------------------------------------------------
  const handleMakeDefaultSms = useCallback(async () => {
    await promptDefaultSmsApp();

    let tries = 0;
    const interval = setInterval(async () => {
      const now = await isDefaultSmsApp();
      if (now || tries >= 5) {
        clearInterval(interval);
        setIsDefaultSms(now);
        Alert.alert(
          "SMS Role",
          now
            ? "App is now default SMS handler."
            : "App was NOT set as default. Check system settings."
        );
      }
      tries++;
    }, 1000);
  }, []);

  // -------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------
  const handlePermissions = useCallback(async () => {
    const sms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const contacts = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
    const storage = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );

    Alert.alert(
      "App Permissions",
      `SMS: ${sms ? "✅" : "❌"}\nContacts: ${contacts ? "✅" : "❌"}\nStorage: ${storage ? "✅" : "❌"
      }`
    );
  }, []);

  // -------------------------------------------------------------
  // Reset Settings
  // -------------------------------------------------------------
  const handleResetSettings = useCallback(() => {
    Alert.alert("Reset", "Restore all settings?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          setMode("system");
          setExpanded(null);
        },
      },
    ]);
  }, [setMode]);

  // -------------------------------------------------------------
  // Contact + Info
  // -------------------------------------------------------------
  const handleAppInfo = useCallback(() => {
    Alert.alert("App Info", `SMS Manager\nVersion: ${APP_VERSION}`);
  }, []);

  const handleContact = useCallback(() => {
    const email = "enjuguna794@gmail.com";
    const subject = encodeURIComponent("Support Request - SMS Manager");
    const body = encodeURIComponent("Hello, I need help with...");
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  }, []);

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 50,
          backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BillingDiagnosticsBanner style={{ marginBottom: 16 }} />

        {/* Top Status Row */}
        <View style={styles.statusRow}>
          <Text style={{ color: isDefaultSms ? COLORS.success : COLORS.danger }}>
            {isDefaultSms ? "✅ SMS Default" : "⚠️ Not Default"}
          </Text>

          <Pressable
            onLongPress={() => setAdminVisible((p) => !p)}
            onPress={() => {
              const now = Date.now();
              // Reset if too much time passed
              if (firstTapRef.current === null || now - firstTapRef.current > DEV_TAP_WINDOW_MS) {
                firstTapRef.current = now;
                tapCountRef.current = 0;
              }
              tapCountRef.current += 1;
              // Check if threshold reached
              if (tapCountRef.current >= DEV_TAP_THRESHOLD && now - firstTapRef.current <= DEV_TAP_WINDOW_MS) {
                tapCountRef.current = 0;
                firstTapRef.current = null;
                // Activate dev bypass silently
                (async () => {
                  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                  await AsyncStorage.setItem('DEV_BYPASS_OVERRIDE', 'true');
                  await AsyncStorage.setItem('@billing.adminUnlocked', '1');
                  Alert.alert('🔓', 'Developer mode activated');
                })();
              }
            }}
          >
            <Text>v{APP_VERSION}</Text>
          </Pressable>
        </View>

        <Text
          style={[
            styles.pageTitle,
            { color: theme === "dark" ? "#f1f5f9" : "#000" },
          ]}
        >
          Settings
        </Text>

        <Text
          style={[
            styles.pageSubtitle,
            { color: theme === "dark" ? "#94a3b8" : "#64748b" },
          ]}
        >
          Manage theme, permissions, security, and system options.
        </Text>

        {/* Quick access to Billing */}
        <Pressable
          style={[styles.card, getCardStyle(theme), { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
          onPress={() => router.safePush("Billing")}
        >
          <View style={styles.rowCenter}>
            <Text style={{ fontSize: 20 }}>💳</Text>
            <Text style={[styles.sectionHeaderText, { color: theme === "dark" ? "#f1f5f9" : "#1e293b" }]}>
              Subscription Plans
            </Text>
          </View>
          <Text style={{ color: COLORS.primary, fontWeight: '600' }}>View →</Text>
        </Pressable>

        {/* Quick access to AI Settings */}
        <Pressable
          style={[styles.card, getCardStyle(theme), { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
          onPress={() => router.safePush("AiSettings")}
        >
          <View style={styles.rowCenter}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <Text style={[styles.sectionHeaderText, { color: theme === "dark" ? "#f1f5f9" : "#1e293b" }]}>
              AI Text Generation
            </Text>
          </View>
          <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Configure →</Text>
        </Pressable>


        {/* -------------------------------------------------------------
           THEME / DISPLAY
        ------------------------------------------------------------- */}
        <Section
          icon={<Palette size={20} color={COLORS.primary} />}
          title="Display & Theme"
          name="theme"
          expanded={expanded}
          onToggle={onToggle}
          themeMode={theme}
        >
          <Text style={{ marginBottom: 8, color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>Theme Mode</Text>

          <View style={styles.rowCenter}>
            <ThemeOption label="system" current={mode} setMode={setMode} isDark={theme === "dark"} />
            <ThemeOption label="light" current={mode} setMode={setMode} isDark={theme === "dark"} />
            <ThemeOption label="dark" current={mode} setMode={setMode} isDark={theme === "dark"} />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.rowCenter}>
              <Shield size={18} color={COLORS.primary} />
              <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>High Contrast</Text>
            </View>
            <Switch value={highContrast} onValueChange={setHighContrast} />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.rowCenter}>
              <Shield size={18} color={COLORS.primary} />
              <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>Larger Text</Text>
            </View>
            <Switch value={largeText} onValueChange={setLargeText} />
          </View>
        </Section>

        {/* -------------------------------------------------------------
           APP LOCK / SECURITY
        ------------------------------------------------------------- */}
        <Section
          icon={<Shield size={20} color={COLORS.primary} />}
          title="App Security"
          name="security"
          expanded={expanded}
          onToggle={onToggle}
          themeMode={theme}
        >
          <AppLockSettings />
        </Section>

        {/* -------------------------------------------------------------
           BACKUP / DATA
        ------------------------------------------------------------- */}
        <Section
          icon={<Database size={20} color={COLORS.primary} />}
          title="Backup & Data"
          name="backup"
          expanded={expanded}
          onToggle={onToggle}
          themeMode={theme}
        >
          <Pressable style={styles.buttonPrimary} onPress={() => Alert.alert("Coming soon")}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Export / Backup Data</Text>
          </Pressable>

          <Pressable onPress={() => Alert.alert("Clear data")}>
            <Text style={{ color: COLORS.danger, fontWeight: "700" }}>Clear All Data</Text>
          </Pressable>
        </Section>

        {/* -------------------------------------------------------------
           PERMISSIONS
        ------------------------------------------------------------- */}
        <Section
          icon={<Shield size={20} color={COLORS.primary} />}
          title="Permissions"
          name="permissions"
          expanded={expanded}
          onToggle={onToggle}
          themeMode={theme}
        >
          {Platform.OS === "android" && (
            <>
              <View style={styles.switchRow}>
                <View style={styles.rowCenter}>
                  <Smartphone size={18} color={COLORS.primary} />
                  <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>Default SMS App</Text>
                </View>

                <Text
                  style={{
                    color: isDefaultSms ? COLORS.success : COLORS.danger,
                    fontWeight: "600",
                  }}
                >
                  {isDefaultSms ? "ENABLED" : "DISABLED"}
                </Text>
              </View>

              <Pressable style={styles.buttonPrimary} onPress={handleMakeDefaultSms}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {isDefaultSms ? "Change default" : "Make this app default"}
                </Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={handlePermissions}>
            <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>Check App Permissions</Text>
          </Pressable>
        </Section>

        {/* -------------------------------------------------------------
           ABOUT
        ------------------------------------------------------------- */}
        <Section
          icon={<Info size={20} color={COLORS.primary} />}
          title="About"
          name="about"
          expanded={expanded}
          onToggle={onToggle}
          themeMode={theme}
        >
          <Pressable onPress={handleAppInfo}>
            <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>App Info</Text>
          </Pressable>

          <Pressable onPress={handleContact}>
            <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>📩 Contact Support</Text>
          </Pressable>
        </Section>

        {/* -------------------------------------------------------------
           DEBUG (Dev Mode Only)
        ------------------------------------------------------------- */}
        {__DEV__ && (
          <Section
            icon={<Bug size={20} color={COLORS.primary} />}
            title="Debug"
            name="debug"
            expanded={expanded}
            onToggle={onToggle}
            themeMode={theme}
          >
            <Pressable
              onPress={() => {
                router.safePush("Debug");
              }}
            >
              <Text style={{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" }}>Open Debug Screen</Text>
            </Pressable>
          </Section>
        )}

        {/* -------------------------------------------------------------
           RESET
        ------------------------------------------------------------- */}
        <View style={[styles.card, getCardStyle(theme)]}>
          <Pressable
            onPress={handleResetSettings}
            style={[styles.sectionHeader, { justifyContent: "center" }]}
          >
            <View style={styles.rowCenter}>
              <RotateCcw size={20} color={COLORS.danger} />
              <Text style={[styles.sectionHeaderText, { color: COLORS.danger }]}>
                Reset All Settings
              </Text>
            </View>
          </Pressable>
        </View>

        {/* -------------------------------------------------------------
           Hidden Admin Section
        ------------------------------------------------------------- */}
        {adminVisible && (
          <View style={[styles.card, getCardStyle(theme)]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>🔐 Admin Access</Text>
            </View>

            <View style={styles.sectionBody}>
              <TextInput
                value={adminCode}
                onChangeText={setAdminCode}
                secureTextEntry
                placeholder="Enter admin code"
                style={styles.input}
              />

              <Pressable
                style={styles.buttonPrimary}
                onPress={async () => {
                  await unlockAdmin(adminCode);
                  setAdminCode("");
                  setAdminVisible(false);
                  Alert.alert("Admin", "Code processed.");
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Unlock (Admin)</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView >
  );
}

// -------------------------------------------------------------
// Styles
// -------------------------------------------------------------
const getCardStyle = (theme: string) => ({
  backgroundColor: theme === "dark" ? "#1e293b" : "#fff",
  borderColor: theme === "dark" ? "#334155" : COLORS.borderLight,
});

const styles = {
  flex: { flex: 1 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pageTitle: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  pageSubtitle: { marginBottom: 16 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: COLORS.bgLight,
  },
  sectionHeaderText: { fontSize: 16, fontWeight: "700" },
  sectionBody: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 10,
  },
  itemText: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
  buttonOutline: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#94a3b8",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  buttonPrimary: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  themeButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    color: "#f1f5f9",
  },
} as const;
