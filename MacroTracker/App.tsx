// App.tsx (Modified for Reload)
import 'react-native-get-random-values'; // MUST BE FIRST
import React, { useState, useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, createTheme } from '@rneui/themed';
import { loadSettings, saveSettings } from './services/storageService';
import { useColorScheme, AppState, AppStateStatus } from 'react-native'; // Import AppState
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Colors } from '@rneui/base';
import { Settings } from './types/settings';

declare module '@rneui/themed' {
  export interface Colors {
    text: string;
    card: string; // Added for better card styling
    successLight: string; // Lighter success color
  }
}

interface MyTheme {
  mode: 'light' | 'dark';
  colors: Colors;
}

const lightTheme: MyTheme = {
  mode: 'light',
  colors: {
    primary: '#2e86de',
    secondary: '#6c757d',
    background: '#f8f9fa',
    grey5: '#e9ecef',
    white: '#ffffff',
    grey4: '#ced4da',
    success: '#28a745',
    successLight: '#d4edda',
    black: '#000000',
    text: '#212529',
    card: '#ffffff',
    error: '#dc3545',
    warning: '#ffc107',
    disabled: '#6c757d',
    divider: '#ced4da',
    platform: {
      ios: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
      android: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
      web: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
      default: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
    },
    grey0: '', grey1: '', grey2: '', grey3: '', greyOutline: '', searchBg: ''
  },
};

const darkTheme: MyTheme = {
  mode: 'dark',
  colors: {
    primary: '#2e86de',
    secondary: '#adb5bd',
    background: '#121212',
    grey5: '#2c2c2c',
    white: '#ffffff',
    grey4: '#343a40',
    success: '#28a745',
    successLight: '#1f5139',
    black: '#000000',
    text: '#f8f9fa',
    card: '#1e1e1e',
    error: '#dc3545',
    warning: '#ffc107',
    disabled: '#6c757d',
    divider: '#343a40',
    platform: {
       ios: {
         primary: '',
         secondary: '',
         grey: '',
         searchBg: '',
         success: '',
         error: '',
         warning: ''
       },
      android: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
      web: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
      default: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: ''
      },
    },
    grey0: '', grey1: '', grey2: '', grey3: '', greyOutline: '', searchBg: ''
  },
};

const App = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [loadedSettings, setLoadedSettings] = useState<Settings | null>(null);
  const colorScheme = useColorScheme();
  const [reloadKey, setReloadKey] = useState(0); // Key for forcing remount
  const [appState, setAppState] = useState(AppState.currentState); // AppState


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
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, trigger reload
        triggerReload();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [appState]); // Depend on appState


  const updateTheme = (newThemeMode: 'light' | 'dark' | 'system') => {
    const isDark = newThemeMode === 'system' ? colorScheme === 'dark' : newThemeMode === 'dark';
    return isDark ? darkTheme : lightTheme;
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
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

  return (
    <ThemeProvider theme={createTheme(currentTheme)} key={themeMode}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={currentTheme.mode === 'dark' ? navigationTheme.dark : navigationTheme.light}
        >
          {/* Pass reloadKey and triggerReload */}
          <AppNavigator onThemeChange={handleThemeChange}  key={reloadKey} onDataOperation={triggerReload}/>
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

export default App;