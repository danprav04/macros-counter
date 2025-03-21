// App.tsx
import 'react-native-get-random-values'; // MUST BE FIRST
import React, { useState, useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, createTheme } from '@rneui/themed';
import { loadSettings, saveSettings } from './services/storageService';
import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Colors } from '@rneui/base';

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
    primary: '#2e86de', // A more modern blue
    secondary: '#6c757d',
    background: '#f8f9fa', // Slightly off-white
    grey5: '#e9ecef',
    white: '#ffffff',
    grey4: '#ced4da',
    success: '#28a745',
    successLight: '#d4edda', // Lighter success
    black: '#000000',
    text: '#212529', // Darker text for better contrast
    card: '#ffffff',
    error: '#dc3545',
    warning: '#ffc107',
    disabled: '#6c757d',
    divider: '#ced4da',
    platform: {
      ios: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
      android: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
      web: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
      default: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
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
    text: '#f8f9fa', // Light text
    card: '#1e1e1e', // Darker card
    error: '#dc3545',
    warning: '#ffc107',
    disabled: '#6c757d',
    divider: '#343a40',
     platform: {
      ios: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
      android: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
      web: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
      default: { /* ... (same as before) */ primary: '', secondary: '', grey: '', searchBg: '', success: '', error: '', warning: ''},
    },
    grey0: '', grey1: '', grey2: '', grey3: '', greyOutline: '', searchBg: ''
  },
};

const App = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [currentTheme, setCurrentTheme] = useState<MyTheme>(lightTheme);
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initializeApp = async () => {
      const settings = await loadSettings();
      const initialThemeMode = settings.theme || 'system';
      setThemeMode(initialThemeMode);
      updateTheme(initialThemeMode);
    };
    initializeApp();
  }, []);

  const updateTheme = (newThemeMode: 'light' | 'dark' | 'system') => {
    const isDark = newThemeMode === 'system' ? colorScheme === 'dark' : newThemeMode === 'dark';
    setCurrentTheme(isDark ? darkTheme : lightTheme);
  };

  useEffect(() => {
    updateTheme(themeMode);
  }, [themeMode, colorScheme]);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(newTheme);
    await saveSettings({ theme: newTheme });
  };

    //Combined themes for brevity
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
    <ThemeProvider theme={createTheme(currentTheme)}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={currentTheme.mode === 'dark' ? navigationTheme.dark : navigationTheme.light}
        >
          <AppNavigator onThemeChange={handleThemeChange} />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

export default App;