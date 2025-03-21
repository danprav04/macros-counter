// App.tsx
import 'react-native-get-random-values'; // <-- MUST BE FIRST
import React, { useState, useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, createTheme } from '@rneui/themed';
import { loadSettings, saveSettings, Settings } from './services/storageService';
import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Colors } from '@rneui/base';

// Module augmentation to extend the Colors interface
declare module '@rneui/themed' {
  export interface Colors {
    text: string; // Add custom color properties here
  }
}

interface MyTheme {
  mode: 'light' | 'dark';
  colors: Colors; // Use the augmented Colors interface
}

const lightTheme: MyTheme = {
  mode: 'light',
  colors: {
    primary: '#007bff',
    background: '#ffffff',
    grey5: '#f2f2f2',
    white: '#ffffff',
    grey4: '#cccccc',
    success: '#28a745',
    black: '#000000',
    text: '#000000', // Set text color for light theme
    secondary: '', // Required by rneui
    warning: '', // Required by rneui
    error: '', // Required by rneui
    disabled: '', // Required by rneui
    divider: '', // Required by rneui
    platform: {
      ios: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
      android: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
      web: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
      default: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
    },
    grey0: '',
    grey1: '',
    grey2: '',
    grey3: '',
    greyOutline: '',
    searchBg: ''
  },
};

const darkTheme: MyTheme = {
  mode: 'dark',
  colors: {
    primary: '#007bff',
    background: '#121212',
    grey5: '#2c2c2c',
    white: '#ffffff',
    grey4: '#333333',
    success: '#28a745',
    black: '#000000',
    text: '#ffffff', // Set text color for dark theme
    secondary: '', // Required by rneui
    warning: '', // Required by rneui
    error: '', // Required by rneui
    disabled: '', // Required by rneui
    divider: '', // Required by rneui
    platform: {
      ios: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
      android: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
      web: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
      default: {
        primary: '',
        secondary: '',
        grey: '',
        searchBg: '',
        success: '',
        error: '',
        warning: '',
      },
    },
    grey0: '',
    grey1: '',
    grey2: '',
    grey3: '',
    greyOutline: '',
    searchBg: ''
  },
};

const App = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [currentTheme, setCurrentTheme] = useState<MyTheme>(lightTheme); // Initialize with light theme
  const colorScheme = useColorScheme();

  // Load settings and set theme
  useEffect(() => {
    const loadInitialSettings = async () => {
      const settings = await loadSettings();
      const initialThemeMode = settings.theme || 'system'; //default to system
      setThemeMode(initialThemeMode);

      updateTheme(initialThemeMode);
    };
    loadInitialSettings();
  }, []);

  const updateTheme = (newThemeMode: 'light' | 'dark' | 'system') => {
    const isDark = newThemeMode === 'system' ? colorScheme === 'dark' : newThemeMode === 'dark';
    setCurrentTheme(isDark ? darkTheme : lightTheme);
  };

  // Update theme when themeMode changes.  This is crucial for live updates.
  useEffect(() => {
    updateTheme(themeMode);
  }, [themeMode, colorScheme]); // colorScheme is needed for "system" theme

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(newTheme);
    await saveSettings({ theme: newTheme }); // Save the new theme.
  };

  const navigationDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: currentTheme.colors.primary,
      background: currentTheme.colors.background,
      card: currentTheme.colors.grey5,
      text: currentTheme.colors.text,
      border: currentTheme.colors.grey4,
      notification: currentTheme.colors.success,
    },
  };

  const navigationLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: currentTheme.colors.primary,
      background: currentTheme.colors.background,
      card: currentTheme.colors.white,
      text: currentTheme.colors.text,
      border: currentTheme.colors.grey4,
      notification: currentTheme.colors.success,
    },
  };

  return (
    <ThemeProvider theme={createTheme(currentTheme)}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={currentTheme.mode === 'dark' ? navigationDarkTheme : navigationLightTheme}
        >
          <AppNavigator onThemeChange={handleThemeChange} />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

export default App;