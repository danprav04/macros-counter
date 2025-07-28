// src/navigation/AppNavigator.tsx
import React from 'react';
import { Platform, useColorScheme, Alert, DevSettings, I18nManager, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme, RouteProp } from '@react-navigation/native';
import { Icon, useTheme, ThemeProvider, createTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';

import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import { useAuth, AuthContextType } from '../context/AuthContext';
import { LanguageCode } from '../types/settings';
import i18n, { setLocale, t } from '../localization/i18n';
import { Food } from '../types/food';
import { setLogoutListener } from '../services/authService';

// Define ParamLists
export type MainTabParamList = {
  DailyEntryRoute: { quickAddFood?: Food };
  FoodListRoute: { openAddFoodModal?: boolean, foodData?: string };
  SettingsStackRoute: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Questionnaire: undefined;
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
const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Main: {
          path: '', 
          screens: {
              FoodListRoute: 'open-add-food-modal', 
          }
      },
    }
  },
};

// Theming
declare module "@rneui/themed" {
  export interface Colors { text: string; card: string; successLight: string; }
}
const lightThemeColors = { primary: "#2e86de", secondary: "#6c757d", background: "#f8f9fa", grey5: "#e9ecef", white: "#ffffff", grey4: "#ced4da", success: "#28a745", successLight: "#d4edda", black: "#000000", text: "#212529", card: "#ffffff", error: "#dc3545", warning: "#ffc107", disabled: "#6c757d", divider: "#ced4da", platform: { ios: {}, android: {}, web: {}, default: {} } as any, grey0: "#f8f9fa", grey1: "#e9ecef", grey2: "#dee2e6", grey3: "#ced4da", greyOutline: "#adb5bd", searchBg: "#ffffff", };
const darkThemeColors = { primary: "#2e86de", secondary: "#adb5bd", background: "#121212", grey5: "#2c2c2c", white: "#ffffff", grey4: "#343a40", success: "#28a745", successLight: "#1f5139", black: "#000000", text: "#f8f9fa", card: "#1e1e1e", error: "#dc3545", warning: "#ffc107", disabled: "#495057", divider: "#343a40", platform: { ios: {}, android: {}, web: {}, default: {} } as any, grey0: "#212529", grey1: "#2c2c2c", grey2: "#343a40", grey3: "#8899a6", greyOutline: "#8899a6", searchBg: "#1e1e1e", };

// Settings Stack Navigator Component
function SettingsStackNavigatorComponent({ onThemeChange, onLocaleChange, onDataOperation, onLogout }: { onThemeChange: (theme: 'light' | 'dark' | 'system') => void; onLocaleChange: (locale: LanguageCode) => void; onDataOperation: () => void; onLogout: () => void; }) {
  const { theme } = useTheme();
  return (
    <SettingsStackNav.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.background }, headerTitleStyle: { color: theme.colors.text }, headerTintColor: theme.colors.primary, headerTitleAlign: 'center' }}>
      <SettingsStackNav.Screen name="SettingsHome" options={{ title: t('settingsScreen.title') }}>
        {(props) => <SettingsScreen {...props} onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} onDataOperation={onDataOperation} onLogout={onLogout} />}
      </SettingsStackNav.Screen>
      <SettingsStackNav.Screen name="Questionnaire" component={QuestionnaireScreen} options={{ title: t('questionnaireScreen.title') }} />
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
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
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
        <SafeAreaView style={{ flex: 1, backgroundColor: currentThemeConfig.colors.background }}>
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
        </SafeAreaView>
    </ThemeProvider>
  );
}

// Main AppNavigator export
export default function AppNavigator() {
    const { isLoading, settings } = useAuth() as AuthContextType;
    
    React.useEffect(() => {
        if (settings) {
            const lang = settings.language === 'system' ? (Localization.getLocales()?.[0]?.languageTag || 'en-US') : settings.language;
            setLocale(lang);
        }
    }, [settings]);

    if (isLoading) {
        return (
            <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Text>Initializing App...</Text>
            </SafeAreaView>
        )
    }

    return <AppContent />;
}