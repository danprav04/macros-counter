// navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { ThemeProvider, createTheme, Icon } from '@rneui/themed';
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { loadSettings } from '../services/storageService';

const Tab = createBottomTabNavigator();

const lightTheme = createTheme({
  mode: 'light',
  components: {

  }
});

const darkTheme = createTheme({
    mode: 'dark',
    components: {

    }
});


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
  const theme = themeMode === 'system' ? (colorScheme === 'dark' ? darkTheme : lightTheme) : (themeMode === 'dark' ? darkTheme : lightTheme);

  return (
    <ThemeProvider theme={theme}>
      <NavigationContainer theme={theme.mode === 'dark' ? {
        dark: true,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.grey5,
          text: theme.colors.white,
          border: theme.colors.grey4,
          notification: theme.colors.success,
        }
      } : {
        dark: false,
        colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.white,
            text: theme.colors.black,
            border: theme.colors.grey4,
            notification: theme.colors.success,
        }
      }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName = '';

              if (route.name === 'Daily Entry') {
                iconName = 'calendar';
              } else if (route.name === 'Foods') {
                iconName = 'fastfood';
              } else if (route.name === 'Settings') {
                iconName = 'settings';
              }

              return <Icon name={iconName} type='ionicon' size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
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