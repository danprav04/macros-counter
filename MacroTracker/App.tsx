// App.tsx (Updated for i18n and fixes)
import './i18n'; // Import i18n configuration FIRST
import "react-native-get-random-values"; // MUST BE AFTER i18n import if i18n uses crypto, otherwise order flexible
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
    LogBox,
    View, // Keep for potential debugging
    Text,  // Keep for potential debugging
} from "react-native";
import {
    NavigationContainer,
    DefaultTheme,
    DarkTheme,
} from "@react-navigation/native";
import { Colors } from "@rneui/base";
import { Settings } from "./types/settings";
import { StatusBar } from "expo-status-bar";
import { I18nextProvider } from 'react-i18next'; // Import I18nextProvider
import i18n from './i18n'; // Import the initialized i18n instance

LogBox.ignoreLogs(["Function components cannot be given refs"]); // Keep this if needed

// Define the custom color properties for the theme
declare module "@rneui/themed" {
    export interface Colors {
        text: string;
        card: string;
        successLight: string;
    }
}

// Define the structure for theme objects
interface MyTheme {
    mode: "light" | "dark";
    colors: Colors;
}

// --- Light Theme Definition ---
const lightTheme: MyTheme = {
  mode: "light",
  colors: {
    primary: "#2e86de",
    secondary: "#6c757d",
    background: "#f8f9fa",
    grey5: "#e9ecef", // Used for some backgrounds/inputs
    white: "#ffffff",
    grey4: "#ced4da", // Used for some borders/placeholders
    success: "#28a745",
    successLight: "#d4edda", // Lighter success variant
    black: "#000000",
    text: "#212529", // Primary text color for light mode
    card: "#ffffff", // Card background
    error: "#dc3545",
    warning: "#ffc107",
    disabled: "#6c757d",
    divider: "#ced4da",
    platform: { ios:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""},android:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""},web:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""},default:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""} }, // Keep platform defaults empty or configure if needed
    // Explicitly define all grey levels used by RNEUI components
    grey0: "#f8f9fa", // Often similar to background
    grey1: "#e9ecef", // Light grey
    grey2: "#dee2e6", // Medium-light grey
    grey3: "#ced4da", // Medium grey
    greyOutline: "#adb5bd", // For outlines, slightly darker than divider
    searchBg: "#ffffff", // Search bar background
  },
};

// --- Dark Theme Definition ---
const darkTheme: MyTheme = {
  mode: "dark",
  colors: {
    primary: "#2e86de", // Keep primary color consistent or adjust for dark mode
    secondary: "#adb5bd", // Lighter secondary for contrast
    background: "#121212", // Standard dark background
    grey5: "#2c2c2c", // Darker grey for inputs/backgrounds
    white: "#ffffff", // Used for text primarily
    grey4: "#343a40", // Medium-dark grey for borders/dividers
    success: "#28a745", // Keep success consistent or use a brighter variant
    successLight: "#1f5139", // Darker success variant
    black: "#000000", // Keep black
    text: "#f8f9fa", // Light text for dark background
    card: "#1e1e1e", // Slightly lighter than background for cards
    error: "#dc3545", // Keep error consistent or use brighter
    warning: "#ffc107", // Keep warning consistent
    disabled: "#6c757d", // Same as light mode, or adjust
    divider: "#343a40", // Same as grey4
    platform: { ios:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""},android:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""},web:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""},default:{primary:"",secondary:"",grey:"",searchBg:"",success:"",error:"",warning:""} }, // Keep platform defaults empty or configure if needed
    // Explicitly define all grey levels
    grey0: "#212529", // Very dark grey
    grey1: "#2c2c2c", // Dark grey (same as grey5)
    grey2: "#343a40", // Medium-dark grey (same as grey4/divider)
    grey3: "#495057", // Medium grey
    greyOutline: "#6c757d", // Lighter grey for outlines (same as disabled)
    searchBg: "#1e1e1e", // Search bar background, match card
  },
};

// --- App Component ---
const App = () => {
    // State Hooks
    const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
    const [loadedSettings, setLoadedSettings] = useState<Settings | null>(null);
    const colorScheme = useColorScheme(); // System theme preference
    const [reloadKey, setReloadKey] = useState(0); // For forcing component re-renders
    const [appState, setAppState] = useState(AppState.currentState); // For detecting foreground/background

    // Effect for Initial App Load (Loads Theme Settings)
    useEffect(() => {
        const initializeApp = async () => {
            console.log("App: Initializing...");
            const settings = await loadSettings();
            console.log("App: Loaded settings:", settings);
            setThemeMode(settings.theme);
            setLoadedSettings(settings);
            // Language is handled by i18n detector via loadLanguage on init
            console.log("App: Initialization complete. Current i18n lang:", i18n.language);
        };
        initializeApp();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Function to trigger a manual reload (e.g., after data import)
    const triggerReload = () => {
        console.log("App: Triggering reload...");
        setReloadKey((prevKey) => prevKey + 1);
    };

    // Effect to handle AppState changes (e.g., reload on foregrounding)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (appState.match(/inactive|background/) && nextAppState === "active") {
                console.log("App: Returned to foreground, triggering reload.");
                triggerReload(); // Optional: Reload data if needed when app comes to foreground
            }
            setAppState(nextAppState);
        };
        const subscription = AppState.addEventListener("change", handleAppStateChange);
        console.log("App: AppState listener added.");
        return () => {
            console.log("App: AppState listener removed.");
            subscription.remove();
        };
    }, [appState]); // Re-run effect if appState changes

    // Function to determine the actual theme object based on mode and system preference
    const updateTheme = (mode: "light" | "dark" | "system") => {
        const isSystemDark = colorScheme === "dark";
        const useDark = mode === "system" ? isSystemDark : mode === "dark";
        console.log(`App: Updating theme. Mode: ${mode}, System Dark: ${isSystemDark}, Use Dark: ${useDark}`);
        return useDark ? darkTheme : lightTheme;
    };

    // Handler for theme changes triggered from SettingsScreen
    const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
        console.log(`App: Theme change requested to ${newTheme}`);
        setThemeMode(newTheme); // Update state immediately for UI responsiveness
        if (loadedSettings) {
            const updatedSettings: Settings = {
                ...loadedSettings,
                theme: newTheme,
            };
            try {
                await saveSettings(updatedSettings);
                setLoadedSettings(updatedSettings); // Keep loadedSettings in sync
                console.log("App: Theme saved successfully.");
            } catch (error) {
                console.error("App: Failed to save theme:", error);
                // Optionally revert themeMode state or show an error
            }
        } else {
             console.warn("App: Cannot save theme, loadedSettings is null.");
        }
    };

    // Determine the current theme object
    const currentTheme = updateTheme(themeMode);

    // Configure themes for React Navigation
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
                notification: currentTheme.colors.successLight, // Or another appropriate color
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
                notification: currentTheme.colors.success, // Or another appropriate color
            },
        },
    };

    // Determine StatusBar style based on the final theme mode
    const statusBarTheme = themeMode === "system" ? colorScheme : themeMode;
    const statusBarTextColor = statusBarTheme === "dark" ? "light" : "dark";
    const statusBarBackgroundColor = currentTheme.colors.background; // Match app background

    // --- Render ---
    return (
        // RNEUI Theme Provider
        <ThemeProvider theme={createTheme(currentTheme)} key={`theme-${themeMode}`}>
            {/* i18next Provider (provides translation context) */}
            <I18nextProvider i18n={i18n}>
                {/* Safe Area Provider (handles notches, status bars) */}
                 {/* Use SafeAreaView as the outermost view for background color consistency */}
                <SafeAreaView style={{ flex: 1, backgroundColor: statusBarBackgroundColor }}>
                    {/* Expo Status Bar */}
                    <StatusBar
                        style={statusBarTextColor}
                        backgroundColor={statusBarBackgroundColor}
                        translucent={false} // Set to false for solid background color
                    />
                    {/* React Navigation Container */}
                    <NavigationContainer
                        theme={
                            currentTheme.mode === "dark"
                                ? navigationTheme.dark
                                : navigationTheme.light
                        }
                    >
                        {/* App Navigator (contains tabs/screens) */}
                        {/* Use reloadKey to force re-render of navigator if needed */}
                        <AppNavigator onThemeChange={handleThemeChange} key={`nav-${reloadKey}`} />
                    </NavigationContainer>
                    {/* Global Toast Message Component */}
                    <Toast />
                </SafeAreaView>
            </I18nextProvider>
        </ThemeProvider>
    );
};

export default App;