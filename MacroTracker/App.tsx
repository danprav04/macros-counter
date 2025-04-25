// App.tsx
// App.tsx (Initialize Client ID)
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
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { Colors } from "@rneui/base";
import { Settings } from "./src/types/settings";
import { LogBox, View, Text } from "react-native"; //Import view for debug
import { StatusBar } from "expo-status-bar"; // changed import
import { getClientId } from "./src/services/clientIDService"; // Import client ID service

LogBox.ignoreLogs(["Function components cannot be given refs"]);

declare module "@rneui/themed" {
  export interface Colors {
    text: string;
    card: string; // Added for better card styling
    successLight: string; // Lighter success color
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
    platform: {
      ios: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
      android: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
      web: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
      default: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
    },
    grey0: "#f8f9fa",
    grey1: "#e9ecef",
    grey2: "#dee2e6",
    grey3: "#ced4da",
    greyOutline: "#adb5bd",
    searchBg: "#ffffff",
  },
};

const darkTheme: MyTheme = {
  mode: "dark",
  colors: {
    primary: "#2e86de",
    secondary: "#adb5bd",
    background: "#121212",
    grey5: "#2c2c2c",
    white: "#ffffff",
    grey4: "#343a40",
    success: "#28a745",
    successLight: "#1f5139",
    black: "#000000",
    text: "#f8f9fa",
    card: "#1e1e1e",
    error: "#dc3545",
    warning: "#ffc107",
    disabled: "#6c757d",
    divider: "#343a40",
    platform: {
      ios: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
      android: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
      web: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
      default: {
        primary: "",
        secondary: "",
        grey: "",
        searchBg: "",
        success: "",
        error: "",
        warning: "",
      },
    },
    grey0: "#212529",
    grey1: "#2c2c2c",
    grey2: "#343a40",
    grey3: "#495057",
    greyOutline: "#6c757d",
    searchBg: "#1e1e1e",
  },
};

const App = () => {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [loadedSettings, setLoadedSettings] = useState<Settings | null>(null);
  const colorScheme = useColorScheme();
  const [appState, setAppState] = useState(AppState.currentState);
  const [themeCheck, setThemeCheck] = useState(0);
  const [isClientIdReady, setIsClientIdReady] = useState(false); // Track client ID readiness

  // Initialize Client ID and Load initial settings
  useEffect(() => {
    const initializeApp = async () => {
      try {
          // Ensure Client ID is ready before loading other data
          await getClientId(); // This generates/retrieves and caches the ID
          setIsClientIdReady(true);
          console.log('Client ID is ready.');

          // Load settings after client ID is confirmed
          const settings = await loadSettings();
          setThemeMode(settings.theme);
          setLoadedSettings(settings);
          console.log('Settings loaded.');
      } catch (error) {
            console.error("Initialization Error:", error);
            // Handle error, maybe show an error screen
      }
    };
    initializeApp();
  }, []); // Run only once on mount

  // AppState Listener
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []); // No appState dependency needed here

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
    setThemeCheck((t) => t + 1);
  };

  const currentTheme = updateTheme(themeMode);

  const navigationTheme = {
    dark: {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: currentTheme.colors.primary,
        background: currentTheme.colors.background,
        card: currentTheme.colors.card,
        text: currentTheme.colors.text,
        border: currentTheme.colors.divider,
        notification: currentTheme.colors.successLight,
      },
    },
    light: {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: currentTheme.colors.primary,
        background: currentTheme.colors.background,
        card: currentTheme.colors.card,
        text: currentTheme.colors.text,
        border: currentTheme.colors.divider,
        notification: currentTheme.colors.success,
      },
    },
  };

  const statusBarTheme = themeMode === "system" ? colorScheme : themeMode;
  const backgroundColor = currentTheme.colors.background;

  // Show loading or placeholder until client ID is ready
  if (!isClientIdReady) {
      return (
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: backgroundColor }}>
              <Text style={{ color: currentTheme.colors.text }}>Initializing...</Text>
              {/* Optionally add an ActivityIndicator */}
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
          <AppNavigator onThemeChange={handleThemeChange} />
        </NavigationContainer>
        <Toast />
      </SafeAreaView>
    </ThemeProvider>
  );
};

export default App;