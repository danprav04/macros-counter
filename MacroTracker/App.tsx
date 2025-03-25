// App.tsx (Modified for Diagnostics and Debugging in Expo Go)
import "react-native-get-random-values"; // MUST BE FIRST
import Toast from "react-native-toast-message";
import React, { useState, useEffect } from "react";
import AppNavigator from "./navigation/AppNavigator";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, createTheme } from "@rneui/themed";
import { loadSettings, saveSettings } from "./services/storageService";
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
import { Settings } from "./types/settings";
import { LogBox, View, Text } from "react-native"; //Import view for debug
import { StatusBar } from "expo-status-bar"; // changed import

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
    // Complete the missing grey colors
    grey0: "#f8f9fa", // Very light, almost white
    grey1: "#e9ecef", // Light grey, same as grey5 (can adjust)
    grey2: "#dee2e6", // Medium-light grey
    grey3: "#ced4da", // Medium grey, same as grey4
    greyOutline: "#adb5bd", // Slightly darker for outlines
    searchBg: "#ffffff", // Background for search input, usually white
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
    // Complete the missing grey colors
    grey0: "#212529", // Very dark, almost black
    grey1: "#2c2c2c", // Dark grey, same as grey5
    grey2: "#343a40", // Medium-dark grey, same as grey4
    grey3: "#495057", // Medium grey
    greyOutline: "#6c757d", // Lighter grey for outlines, same as disabled
    searchBg: "#1e1e1e", // Background for search, dark to match card
  },
};

const App = () => {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [loadedSettings, setLoadedSettings] = useState<Settings | null>(null);
  const colorScheme = useColorScheme();
  const [reloadKey, setReloadKey] = useState(0); // Key for forcing remount
  const [appState, setAppState] = useState(AppState.currentState); // AppState
  const [themeCheck, setThemeCheck] = useState(0); //Added theme check

  // Load initial settings
  useEffect(() => {
    const initializeApp = async () => {
      const settings = await loadSettings();
      setThemeMode(settings.theme);
      setLoadedSettings(settings);
    };
    initializeApp();
  }, []);

  // Function to trigger a reload
  const triggerReload = () => {
    setReloadKey((prevKey) => prevKey + 1);
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground, trigger reload
        triggerReload();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [appState]); // Depend on appState

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

  // Determine status bar style based on theme
  const statusBarTheme = themeMode === "system" ? colorScheme : themeMode;

  const backgroundColor = currentTheme.colors.background;

  return (
    <ThemeProvider theme={createTheme(currentTheme)} key={themeMode}>
      {/* Added to try force to behave like a normal text */}
      <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>
        {" "}
        {/* Enclose everything in SafeAreaView */}
        <StatusBar
          style={statusBarTheme === "dark" ? "light" : "dark"} // Text color
          backgroundColor={backgroundColor} // Background color from theme
          translucent={false} // Disable translucency for now (easier debugging)
        />
        <NavigationContainer
          theme={
            currentTheme.mode === "dark"
              ? navigationTheme.dark
              : navigationTheme.light
          }
        >
          <AppNavigator onThemeChange={handleThemeChange} key={reloadKey} />
        </NavigationContainer>
        <Toast />
      </SafeAreaView>
    </ThemeProvider>
  );
};

export default App;
