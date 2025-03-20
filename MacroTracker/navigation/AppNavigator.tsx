// navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { ThemeProvider, createTheme, Icon, useTheme } from '@rneui/themed';
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { loadSettings } from '../services/storageService';

const Tab = createBottomTabNavigator();

// Define a custom theme interface that extends the RNE UI Theme
interface MyTheme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    background: string;
    grey5: string;
    white: string;
    grey4: string;
    success: string;
    black: string;
    // Add other custom colors if needed
  };
  // You can add other theme properties here if needed, like fonts, spacing, etc.
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
  },
};

const AppNavigator = () => {
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark' | 'system'>('system');

  React.useEffect(() => {
    const loadInitialSettings = async () => {
      const settings = await loadSettings();
      setThemeMode(settings.theme);
    };
    loadInitialSettings();
  }, []);

  const colorScheme = useColorScheme();
  const currentTheme = themeMode === 'system' ? (colorScheme === 'dark' ? darkTheme : lightTheme) : (themeMode === 'dark' ? darkTheme : lightTheme);


    const navigationDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: currentTheme.colors.primary,
      background: currentTheme.colors.background,
      card: currentTheme.colors.grey5,
      text: currentTheme.colors.white,
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
          text: currentTheme.colors.black,
          border: currentTheme.colors.grey4,
          notification: currentTheme.colors.success,
        },
    };


  return (
    <ThemeProvider theme={createTheme(currentTheme)}>
      <NavigationContainer theme={currentTheme.mode === 'dark' ? navigationDarkTheme : navigationLightTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName = '';
              let type = '';

              if (route.name === 'Daily Entry') {
                iconName = 'calendar';
                type = 'ionicon'
              } else if (route.name === 'Foods') {
                iconName = 'fastfood';
                type = 'material'
              } else if (route.name === 'Settings') {
                iconName = 'settings';
                type = 'ionicon'
              }

              return <Icon name={iconName} type={type} size={size} color={color} />;
            },
            tabBarActiveTintColor: currentTheme.colors.primary,
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen name="Daily Entry" component={DailyEntryScreen} />
          <Tab.Screen name="Foods" component={FoodListScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default AppNavigator;