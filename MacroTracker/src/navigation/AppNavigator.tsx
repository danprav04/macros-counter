// src/navigation/AppNavigator.tsx
import React, { useState } from 'react';
import { Platform, useColorScheme, I18nManager, Text, View, ActivityIndicator } from 'react-native';
import { Alert } from '../components/CustomAlert';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationOptions, NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme, RouteProp, getStateFromPath, createNavigationContainerRef } from '@react-navigation/native';
import { Icon, useTheme, ThemeProvider, createTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import RNRestart from 'react-native-restart';

import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import UpdateRequiredModal from '../components/UpdateRequiredModal';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import AdLoadingModal from '../components/AdLoadingModal';
import FirstRunModal, { MissingConsents } from '../components/FirstRunModal';
import { BackgroundTaskBubble } from '../components/BackgroundTaskBubble'; // Added import
import { CustomToast } from '../components/CustomToast';
import { CustomAlertComponent } from '../components/CustomAlert';

import { useAuth, AuthContextType } from '../context/AuthContext';
import { LanguageCode, SettingsStackParamList } from '../types/settings';
import i18n, { setLocale, t } from '../localization/i18n';
import { Food } from '../types/food';
import { setLogoutListener } from '../services/authService';
import { getAppConfig, updateUserCompliance } from '../services/backendService';
import { compareVersions } from '../utils/versionUtils';
import useDelayedLoading from '../hooks/useDelayedLoading';

// Define ParamLists
export type MainTabParamList = {
  DailyEntryRoute: { quickAddFood?: Food, backgroundResults?: { type: string, items: any[] } };
  FoodListRoute: { openAddFoodModal?: boolean, foodData?: string, data?: string, backgroundFoodResult?: any };
  SettingsStackRoute: { screen: keyof SettingsStackParamList, params?: any };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type RootStackParamList = {
  Auth: { screen: keyof AuthStackParamList }; // Make Auth accessible as a nested stack
  Main: undefined;
  Questionnaire: { fromPrompt?: boolean } | undefined; // Moved to RootStack for modal behavior
};

// Create Navigators
const Tab = createBottomTabNavigator<MainTabParamList>();
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Linking configuration
const productionBackendUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION || 'https://v1.macros-vision-ai.xyz';

const linking = {
  prefixes: [
    Linking.createURL('/'),
    productionBackendUrl,
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
        },
      },
      Main: {
        path: '',
        screens: {
          DailyEntryRoute: '',
          FoodListRoute: 'share/food',
        }
      },
    }
  },
  getStateFromPath: (path: string, options: any) => {
    if (path.includes('open-add-food-modal')) {
      const queryIndex = path.indexOf('?');
      let params: Record<string, string> = {};
      if (queryIndex !== -1) {
        const queryString = path.slice(queryIndex + 1);
        const pairs = queryString.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        }
      }
      params.openAddFoodModal = 'true';

      return {
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'FoodListRoute',
                  params: params,
                },
              ],
            },
          },
        ],
      };
    }
    return getStateFromPath(path, options);
  },
};

// Theming
declare module "@rneui/themed" {
  export interface Colors { text: string; card: string; successLight: string; primaryLight: string; }
}

export const lightThemeColors = {
  primary: "#2e86de",
  secondary: "#475569",
  background: "#ffffff",
  grey5: "#cbd5e1",
  white: "#ffffff",
  grey4: "#94a3af",
  success: "#10b981",
  successLight: "#d1fae5",
  black: "#000000",
  text: "#1a202c",
  card: "#f8fafc",
  error: "#ef4444",
  warning: "#f59e0b",
  disabled: "#64748b",
  divider: "#cbd5e1",
  platform: { ios: {}, android: {}, web: {}, default: {} } as any,
  grey0: "#f8fafc",
  grey1: "#e2e8f0",
  grey2: "#cbd5e1",
  grey3: "#94a3af",
  greyOutline: "#64748b",
  searchBg: "#f8fafc",
  primaryLight: '#dbeafe'
};

export const darkThemeColors = {
  primary: "#3b9eff",
  secondary: "#94a3b8",
  background: "#0a0f1e",
  grey5: "#2d3b4e",
  white: "#ffffff",
  grey4: "#64748b",
  success: "#10b981",
  successLight: "#064e3b",
  black: "#000000",
  text: "#f1f5f9",
  card: "#151d2e",
  error: "#f87171",
  warning: "#fbbf24",
  disabled: "#94a3af",
  divider: "#2d3b4e",
  platform: { ios: {}, android: {}, web: {}, default: {} } as any,
  grey0: "#050812",
  grey1: "#1a2332",
  grey2: "#2d3b4e",
  grey3: "#64748b",
  greyOutline: "#94a3af",
  searchBg: "#151d2e",
  primaryLight: '#1e3a5f'
};

// Settings Stack Navigator Component
function SettingsStackNavigatorComponent({ onThemeChange, onLocaleChange, onDataOperation, onLogout }: { onThemeChange: (theme: 'light' | 'dark' | 'system') => void; onLocaleChange: (locale: LanguageCode) => void; onDataOperation: () => void; onLogout: () => void; }) {
  const { theme } = useTheme();
  return (
    <SettingsStackNav.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.background }, headerTitleStyle: { color: theme.colors.text }, headerTintColor: theme.colors.primary, headerTitleAlign: 'center' }}>
      <SettingsStackNav.Screen name="SettingsHome" options={{ title: t('settingsScreen.title') }}>
        {(props: NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>) => <SettingsScreen {...props} onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} onDataOperation={onDataOperation} onLogout={onLogout} />}
      </SettingsStackNav.Screen>
      <SettingsStackNav.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: t('settingsScreen.general.privacyPolicy') }} />
      <SettingsStackNav.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: t('settingsScreen.general.termsOfService') }} />
    </SettingsStackNav.Navigator>
  );
}

// Main Tab Navigator Component
function MainTabNavigator({ onThemeChange, onLocaleChange, onLogout }: { onThemeChange: (theme: 'light' | 'dark' | 'system') => void; onLocaleChange: (locale: LanguageCode) => void; onLogout: () => void; }) {
  const { theme } = useTheme();
  const [foodListRefresh, setFoodListRefresh] = React.useState(false);
  const handleFoodChange = React.useCallback(() => setFoodListRefresh(prev => !prev), []);

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<MainTabParamList, keyof MainTabParamList> }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: string = '';
          if (route.name === 'DailyEntryRoute') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'FoodListRoute') iconName = focused ? 'fast-food' : 'fast-food-outline';
          else if (route.name === 'SettingsStackRoute') iconName = focused ? 'settings' : 'settings-outline';
          return <Icon name={iconName} type='ionicon' size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.colors.background, borderTopColor: theme.colors.divider },
        tabBarLabelStyle: { fontWeight: 'bold' }
      })}
    >
      <Tab.Screen name="DailyEntryRoute" options={{ title: t('dailyEntryScreen.tabTitle') }}>
        {() => <DailyEntryScreen key={`${foodListRefresh}-${i18n.locale}`} />}
      </Tab.Screen>
      <Tab.Screen name="FoodListRoute" options={{ title: t('foodListScreen.tabTitle') }}>
        {() => <FoodListScreen onFoodChange={handleFoodChange} key={`${foodListRefresh}-${i18n.locale}`} />}
      </Tab.Screen>
      <Tab.Screen name="SettingsStackRoute" options={{ title: t('settingsScreen.title') }}>
        {() => <SettingsStackNavigatorComponent onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} onDataOperation={handleFoodChange} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Auth Stack Navigator Component
function AuthNavigator() {
  const { theme } = useTheme();
  const screenOptions: NativeStackNavigationOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: theme.colors.background },
    presentation: 'modal', // Make Auth screens feel like a separate flow/modal
  };
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: true, title: t('settingsScreen.general.privacyPolicy'), headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.primary, headerTitleStyle: { color: theme.colors.text } }} />
      <AuthStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: true, title: t('settingsScreen.general.termsOfService'), headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.primary, headerTitleStyle: { color: theme.colors.text } }} />
    </AuthStack.Navigator>
  )
}

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// App Content
function AppContent() {
  const { authState, settings, user, changeTheme, changeLocale, logout, refreshUser, isGuest } = useAuth() as AuthContextType;
  const colorScheme = useColorScheme();
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
  const [storeUrl, setStoreUrl] = useState('');

  // Compliance State
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [missingConsents, setMissingConsents] = useState<MissingConsents>({
    tos: false, health: false, transfer: false, medical: false, hitl: false
  });
  const [latestTosVersion, setLatestTosVersion] = useState('');

  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const remoteConfig = await getAppConfig();
        const currentVersion = Constants.expoConfig?.version;
        const requiredVersion = remoteConfig.current_version;

        setLatestTosVersion(remoteConfig.tos_current_version || '1.0.0');

        if (currentVersion && requiredVersion && compareVersions(currentVersion, requiredVersion) < 0) {
          const links = Constants.expoConfig?.extra?.storeLinks;
          const platformUrl = Platform.OS === 'ios' ? links?.ios : links?.android;
          if (platformUrl) {
            setStoreUrl(platformUrl);
            setIsUpdateRequired(true);
          }
        }
      } catch (error) {
        console.warn("Could not check for app updates:", error);
      }
    };
    checkVersion();
  }, []);

  // --- Logic to Show Compliance / Liability Modal ---
  React.useEffect(() => {
    // Only show compliance modal for authenticated users (not guests)
    if (authState.authenticated && user && latestTosVersion && !isGuest) {
      const userAgreedVersion = user.tos_version || '0.0.0';

      const missing = {
        tos: !user.tos_agreed_at || compareVersions(userAgreedVersion, latestTosVersion) < 0,
        health: !user.consent_health_data_at,
        transfer: !user.consent_data_transfer_at,
        medical: !user.acknowledged_not_medical_device_at,
        hitl: !user.agreed_to_human_in_the_loop_at,
      };

      if (missing.tos || missing.health || missing.transfer || missing.medical || missing.hitl) {
        setMissingConsents(missing);
        setShowComplianceModal(true);
      } else {
        setShowComplianceModal(false);
      }
    } else {
      setShowComplianceModal(false);
    }
  }, [authState.authenticated, user, latestTosVersion, isGuest]);

  const handleAgreeToCompliance = async (updatedConsents: MissingConsents) => {
    try {
      const currentIsoTime = new Date().toISOString();
      const payload: any = {};

      if (missingConsents.tos) {
        payload.tos_agreed_at = currentIsoTime;
        payload.tos_version = latestTosVersion;
      }
      if (missingConsents.health) payload.consent_health_data_at = currentIsoTime;
      if (missingConsents.transfer) payload.consent_data_transfer_at = currentIsoTime;
      if (missingConsents.medical) payload.acknowledged_not_medical_device_at = currentIsoTime;
      if (missingConsents.hitl) payload.agreed_to_human_in_the_loop_at = currentIsoTime;

      await updateUserCompliance(payload);
      await refreshUser?.();
      setShowComplianceModal(false);
    } catch (error) {
      Alert.alert("Error", "Could not save your agreements. Please check your connection.");
    }
  };

  React.useEffect(() => {
    if (logout) {
      setLogoutListener(logout);
    }
    return () => setLogoutListener(null);
  }, [logout]);

  const themeMode = settings.theme;
  const currentThemeConfig = React.useMemo(() => {
    const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
    return isDark ? { mode: 'dark' as const, colors: darkThemeColors } : { mode: 'light' as const, colors: lightThemeColors };
  }, [themeMode, colorScheme]);

  const navigationTheme = React.useMemo(() => ({
    dark: { ...DarkTheme, colors: { ...DarkTheme.colors, primary: currentThemeConfig.colors.primary, background: currentThemeConfig.colors.background, card: currentThemeConfig.colors.card, text: currentThemeConfig.colors.text, border: currentThemeConfig.colors.divider, notification: currentThemeConfig.colors.successLight, }, },
    light: { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: currentThemeConfig.colors.primary, background: currentThemeConfig.colors.background, card: currentThemeConfig.colors.card, text: currentThemeConfig.colors.text, border: currentThemeConfig.colors.divider, notification: currentThemeConfig.colors.success, }, },
  }), [currentThemeConfig]);

  const handleLocaleChange = (newLocale: LanguageCode) => {
    const oldLocale = settings.language === 'system' ? (Localization.getLocales()?.[0]?.languageTag || 'en-US').split('-')[0] : settings.language;
    changeLocale(newLocale);
    const newEffectiveLocale = newLocale === 'system' ? (Localization.getLocales()?.[0]?.languageTag || 'en-US').split('-')[0] : newLocale;

    const oldIsRTL = oldLocale === 'he';
    const newIsRTL = newEffectiveLocale === 'he';

    if (oldIsRTL !== newIsRTL && Platform.OS !== 'web') {
      Alert.alert(t('confirmationModal.restartRequiredTitle'), t('settingsScreen.language.restartMessage'),
        [{ text: t('app.alertButtons.later'), style: "cancel" },
        {
          text: t('app.alertButtons.restartNow'),
          onPress: () => RNRestart.Restart()
        }
        ]
      );
    } else if (Platform.OS === 'web' && oldIsRTL !== newIsRTL) {
      window.location.reload();
    }
  };

  const LoadingFallback = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: currentThemeConfig.colors.background }}>
      <Text style={{ color: currentThemeConfig.colors.text }}>Loading...</Text>
    </View>
  )

  return (
    <ThemeProvider theme={createTheme(currentThemeConfig)}>
      <View style={{ flex: 1, backgroundColor: currentThemeConfig.colors.background }}>
        <StatusBar style={currentThemeConfig.mode === "dark" ? "light" : "dark"} backgroundColor={currentThemeConfig.colors.background} />
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          theme={currentThemeConfig.mode === 'dark' ? navigationTheme.dark : navigationTheme.light}
          fallback={<LoadingFallback />}
          onStateChange={() => {
            const state = navigationRef.current?.getRootState();
            const mainRoute = state?.routes?.find(r => r.name === 'Main');
            const tabState = mainRoute?.state;
            const activeTab = tabState?.routes?.[tabState.index ?? 0];
            setCurrentRouteName(activeTab?.name);
          }}
        >
          <View style={{ flex: 1, backgroundColor: currentThemeConfig.colors.background }}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {/* Main is the default access route now */}
              <RootStack.Screen name="Main">
                {() => <MainTabNavigator onThemeChange={changeTheme} onLocaleChange={handleLocaleChange} onLogout={logout!} />}
              </RootStack.Screen>

              {/* Auth Stack accessible via navigation, especially for guests upgrading */}
              <RootStack.Screen name="Auth" component={AuthNavigator} />

              {/* Questionnaire as a modal in RootStack to avoid navigation issues from multiple tabs */}
              <RootStack.Screen
                name="Questionnaire"
                component={QuestionnaireScreen}
                options={{
                  headerShown: true,
                  title: t('questionnaireScreen.title'),
                  presentation: 'modal',
                  headerStyle: { backgroundColor: currentThemeConfig.colors.background },
                  headerTitleStyle: { color: currentThemeConfig.colors.text },
                  headerTintColor: currentThemeConfig.colors.primary,
                  headerTitleAlign: 'center'
                }}
              />
            </RootStack.Navigator>

            <UpdateRequiredModal isVisible={isUpdateRequired} storeUrl={storeUrl} />
            {currentRouteName !== 'SettingsStackRoute' && <BackgroundTaskBubble />}
            <AdLoadingModal />
            <FirstRunModal
              isVisible={showComplianceModal}
              missingConsents={missingConsents}
              onAgree={handleAgreeToCompliance}
            />
            <CustomAlertComponent />
          </View>
        </NavigationContainer>
        <CustomToast />
      </View>
    </ThemeProvider>
  );
}

// Main AppNavigator export
export default function AppNavigator() {
  const { isLoading, settings } = useAuth() as AuthContextType;
  const showLoading = useDelayedLoading(isLoading);

  React.useEffect(() => {
    if (settings) {
      const lang = settings.language === 'system' ? (Localization.getLocales()?.[0]?.languageTag || 'en-US') : settings.language;
      setLocale(lang);
    }
  }, [settings]);

  if (isLoading) {
    if (showLoading) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: lightThemeColors.background }}>
          <ActivityIndicator size="large" color={lightThemeColors.primary} />
          <Text style={{ marginTop: 10, color: lightThemeColors.text, fontSize: 16 }}>
            {t('app.initializing')}
          </Text>
        </SafeAreaView>
      );
    }
    return null;
  }

  return <AppContent />;
}
