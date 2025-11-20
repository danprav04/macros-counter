// src/navigation/AppNavigator.tsx
import React, { useState } from 'react';
import { Platform, useColorScheme, Alert, DevSettings, I18nManager, Text, View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationOptions, NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme, RouteProp, getStateFromPath } from '@react-navigation/native';
import { Icon, useTheme, ThemeProvider, createTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';

import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import UpdateRequiredModal from '../components/UpdateRequiredModal';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import AdLoadingModal from '../components/AdLoadingModal';

import { useAuth, AuthContextType } from '../context/AuthContext';
import { LanguageCode } from '../types/settings';
import i18n, { setLocale, t } from '../localization/i18n';
import { Food } from '../types/food';
import { setLogoutListener } from '../services/authService';
import { getAppConfig } from '../services/backendService';
import { compareVersions } from '../utils/versionUtils';
import useDelayedLoading from '../hooks/useDelayedLoading';

// Define ParamLists
export type MainTabParamList = {
  DailyEntryRoute: { quickAddFood?: Food };
  FoodListRoute: { openAddFoodModal?: boolean, foodData?: string, data?: string };
  SettingsStackRoute: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Questionnaire: undefined;
  PrivacyPolicy: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
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
      productionBackendUrl, // Support HTTPS deep links
  ],
  config: {
    screens: {
      Main: {
          path: '', 
          screens: {
              // Map the HTTPS path 'share/food' to this screen
              FoodListRoute: 'share/food', 
          }
      },
    }
  },
  getStateFromPath: (path: string, options: any) => {
    // Manually handle the legacy custom scheme path 'open-add-food-modal'
    if (path.includes('open-add-food-modal')) {
        // Basic parsing to extract query parameters
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
        // Ensure openAddFoodModal is set if using this legacy path
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
    // Default behavior for other paths (like share/food)
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
      <SettingsStackNav.Screen name="Questionnaire" component={QuestionnaireScreen} options={{ title: t('questionnaireScreen.title') }} />
      <SettingsStackNav.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: t('settingsScreen.general.privacyPolicy') }} />
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
        contentStyle: { backgroundColor: theme.colors.background }
    };
    return (
        <AuthStack.Navigator screenOptions={screenOptions}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
    )
}

// App Content - Determines which stack to show
function AppContent() {
  const { authState, settings, changeTheme, changeLocale, logout } = useAuth() as AuthContextType;
  const colorScheme = useColorScheme();
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');

  React.useEffect(() => {
    const checkVersion = async () => {
        try {
            const remoteConfig = await getAppConfig();
            const currentVersion = Constants.expoConfig?.version;
            const requiredVersion = remoteConfig.current_version;

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


  React.useEffect(() => {
    if (logout) {
      setLogoutListener(logout);
    }
    return () => setLogoutListener(null); // Cleanup on unmount
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
        Alert.alert( t('confirmationModal.restartRequiredTitle'), t('settingsScreen.language.restartMessage'),
            [ { text: t('app.alertButtons.later'), style: "cancel" },
              { text: t('app.alertButtons.restartNow'), onPress: () => DevSettings.reload() } ]
        );
    } else if (Platform.OS === 'web' && oldIsRTL !== newIsRTL) {
        window.location.reload();
    }
  };

  const LoadingFallback = () => (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: currentThemeConfig.colors.background}}>
          <Text style={{color: currentThemeConfig.colors.text}}>Loading...</Text>
      </View>
  )

  return (
    <ThemeProvider theme={createTheme(currentThemeConfig)}>
        <View style={{ flex: 1, backgroundColor: currentThemeConfig.colors.background }}>
            <StatusBar style={currentThemeConfig.mode === "dark" ? "light" : "dark"} backgroundColor={currentThemeConfig.colors.background} />
            <NavigationContainer 
                linking={linking} 
                theme={currentThemeConfig.mode === 'dark' ? navigationTheme.dark : navigationTheme.light} 
                fallback={<LoadingFallback />}
            >
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    {authState.authenticated ? (
                         <RootStack.Screen name="Main">
                             {() => <MainTabNavigator onThemeChange={changeTheme} onLocaleChange={handleLocaleChange} onLogout={logout!} />}
                         </RootStack.Screen>
                    ) : (
                        <RootStack.Screen name="Auth" component={AuthNavigator} />
                    )}
                </RootStack.Navigator>
            </NavigationContainer>
            <UpdateRequiredModal isVisible={isUpdateRequired} storeUrl={storeUrl} />
            <AdLoadingModal />
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
                <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: lightThemeColors.background}}>
                    <ActivityIndicator size="large" color={lightThemeColors.primary} />
                    <Text style={{marginTop: 10, color: lightThemeColors.text, fontSize: 16}}>
                        {t('app.initializing')}
                    </Text>
                </SafeAreaView>
            );
        }
        return null; // Render nothing during the initial delay
    }

    return <AppContent />;
}