// App.tsx
// App.tsx
import "react-native-get-random-values"; // MUST BE FIRST
import Toast from "react-native-toast-message";
import React, { useState, useEffect } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, createTheme } from "@rneui/themed";
import { loadSettings, saveSettings } from "./src/services/storageService";
import {
  useColorScheme,
  AppState,
  AppStateStatus,
  Platform,
  I18nManager, // Import I18nManager
  Alert, // For restart prompt
  DevSettings // For dev reload
} from "react-native";
import * as Localization from 'expo-localization';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { Colors } from "@rneui/base";
import { Settings, LanguageCode } from "./src/types/settings";
import { LogBox, View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getClientId } from "./src/services/clientIDService";
import i18n, { setLocale, t } from './src/localization/i18n'; // Import i18n setup

LogBox.ignoreLogs(["Function components cannot be given refs"]);

declare module "@rneui/themed" {
  export interface Colors {
    text: string;
    card: string;
    successLight: string;
  }
}

interface MyTheme {
  mode: "light" | "dark";
  colors: Colors;
}

const lightTheme: MyTheme = {
  mode: "light",
  colors: {
    primary: "#2e86de",
    secondary: "#6c757d",
    background: "#f8f9fa",
    grey5: "#e9ecef",
    white: "#ffffff",
    grey4: "#ced4da",
    success: "#28a745",
    successLight: "#d4edda",
    black: "#000000",
    text: "#212529",
    card: "#ffffff",
    error: "#dc3545",
    warning: "#ffc107",
    disabled: "#6c757d",
    divider: "#ced4da",
    platform: { ios: {}, android: {}, web: {}, default: {} } as any,
    grey0: "#f8f9fa", grey1: "#e9ecef", grey2: "#dee2e6", grey3: "#ced4da",
    greyOutline: "#adb5bd", searchBg: "#ffffff",
  },
};

const darkTheme: MyTheme = {
  mode: "dark",
  colors: {
    primary: "#2e86de", secondary: "#adb5bd", background: "#121212",
    grey5: "#2c2c2c", white: "#ffffff", grey4: "#343a40",
    success: "#28a745", successLight: "#1f5139", black: "#000000",
    text: "#f8f9fa", card: "#1e1e1e", error: "#dc3545",
    warning: "#ffc107", disabled: "#6c757d", divider: "#343a40",
    platform: { ios: {}, android: {}, web: {}, default: {} } as any,
    grey0: "#212529", grey1: "#2c2c2c", grey2: "#343a40",
    grey3: "#495057", greyOutline: "#6c757d", searchBg: "#1e1e1e",
  },
};

const App = () => {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('system');
  const [loadedSettings, setLoadedSettings] = useState<Settings | null>(null);
  const colorScheme = useColorScheme();
  const [appState, setAppState] = useState(AppState.currentState);
  const [isClientIdReady, setIsClientIdReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // New state for overall initialization

  // Initialize Client ID, Load initial settings, and set up i18n
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await getClientId();
        setIsClientIdReady(true);
        console.log('Client ID is ready.');

        const settings = await loadSettings();
        setThemeMode(settings.theme);
        setCurrentLanguage(settings.language);

        if (settings.language === 'system') {
          const deviceLocale = Localization.getLocales()?.[0]?.languageTag || 'en-US';
          setLocale(deviceLocale);
        } else {
          setLocale(settings.language);
        }
        setLoadedSettings(settings);
        console.log('Settings loaded and locale set:', i18n.locale);
        setIsInitialized(true); // Mark initialization as complete
      } catch (error) {
        console.error("Initialization Error:", error);
        setIsInitialized(true); // Still mark as initialized to show app, even with error
      }
    };
    initializeApp();
  }, []);

  // AppState Listener
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const updateTheme = (newThemeMode: "light" | "dark" | "system") => {
    const isDark =
      newThemeMode === "system"
        ? colorScheme === "dark"
        : newThemeMode === "dark";
    return isDark ? darkTheme : lightTheme;
  };

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setThemeMode(newTheme);
    if (loadedSettings) {
      const updatedSettings: Settings = {
        ...loadedSettings,
        theme: newTheme,
      };
      await saveSettings(updatedSettings);
      setLoadedSettings(updatedSettings);
    }
  };

  const handleLocaleChange = async (newLocale: LanguageCode) => {
    const oldLocale = currentLanguage === 'system'
        ? (Localization.getLocales()?.[0]?.languageTag || 'en-US').split('-')[0]
        : currentLanguage;
    
    setCurrentLanguage(newLocale);
    if (newLocale === 'system') {
        const deviceLocale = Localization.getLocales()?.[0]?.languageTag || 'en-US';
        setLocale(deviceLocale);
    } else {
        setLocale(newLocale);
    }

    if (loadedSettings) {
        const updatedSettings: Settings = { ...loadedSettings, language: newLocale };
        await saveSettings(updatedSettings);
        setLoadedSettings(updatedSettings);
    }

    const newEffectiveLocale = newLocale === 'system'
        ? (Localization.getLocales()?.[0]?.languageTag || 'en-US').split('-')[0]
        : newLocale;

    // Prompt for restart if RTL/LTR direction changes
    const oldIsRTL = oldLocale === 'he';
    const newIsRTL = newEffectiveLocale === 'he';

    if (oldIsRTL !== newIsRTL) {
        Alert.alert(
            "Restart Required", // This title itself should ideally be translated, but for a restart prompt it might be acceptable.
            t('settingsScreen.language.restartMessage'),
            [
                {
                    text: "Later", // also translatable
                    style: "cancel"
                },
                {
                    text: "Restart Now", // also translatable
                    onPress: () => {
                        // In a real build, you'd use Updates.reloadAsync()
                        // For development in Expo Go, this reloads the JS bundle
                        DevSettings.reload();
                    }
                }
            ]
        );
    }
  };


  const currentTheme = updateTheme(themeMode);

  const navigationTheme = {
    dark: {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: currentTheme.colors.primary, background: currentTheme.colors.background,
        card: currentTheme.colors.card, text: currentTheme.colors.text,
        border: currentTheme.colors.divider, notification: currentTheme.colors.successLight,
      },
    },
    light: {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: currentTheme.colors.primary, background: currentTheme.colors.background,
        card: currentTheme.colors.card, text: currentTheme.colors.text,
        border: currentTheme.colors.divider, notification: currentTheme.colors.success,
      },
    },
  };

  const statusBarTheme = themeMode === "system" ? colorScheme : themeMode;
  const backgroundColor = currentTheme.colors.background;

  if (!isInitialized) { // Check overall initialization
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: backgroundColor }}>
        <Text style={{ color: currentTheme.colors.text }}>{t('app.initializing')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider theme={createTheme(currentTheme)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>
        <StatusBar
          style={statusBarTheme === "dark" ? "light" : "dark"}
          backgroundColor={backgroundColor}
          translucent={false}
        />
        <NavigationContainer
          theme={
            currentTheme.mode === "dark"
              ? navigationTheme.dark
              : navigationTheme.light
          }
        >
          <AppNavigator onThemeChange={handleThemeChange} onLocaleChange={handleLocaleChange} />
        </NavigationContainer>
        <Toast />
      </SafeAreaView>
    </ThemeProvider>
  );
};

export default App;