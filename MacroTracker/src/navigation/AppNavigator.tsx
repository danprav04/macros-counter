// src/navigation/AppNavigator.tsx
// navigation/AppNavigator.tsx
import React, { useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, useTheme } from '@rneui/themed';
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { LanguageCode } from '../types/settings'; // Import LanguageCode
import i18n, { t } from '../localization/i18n';

const Tab = createBottomTabNavigator();

interface AppNavigatorProps {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onLocaleChange: (locale: LanguageCode) => void; // Add onLocaleChange
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ onThemeChange, onLocaleChange }) => {
  const { theme } = useTheme();
  const [foodListRefresh, setFoodListRefresh] = useState(false);

  const handleFoodChange = useCallback(() => {
    setFoodListRefresh(prev => !prev);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';
          let type: string = 'ionicon'; // Default type

          if (route.name === t('dailyEntryScreen.tabTitle')) {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === t('foodListScreen.tabTitle')) {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === t('settingsScreen.title')) {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Icon name={iconName} type={type} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.divider,
        },
        tabBarLabelStyle: {
          fontWeight: 'bold',
        }
      })}
    >
      <Tab.Screen name={t('dailyEntryScreen.tabTitle')}>
        {() => <DailyEntryScreen key={`${foodListRefresh}-${i18n.locale}`} />}
      </Tab.Screen>
      <Tab.Screen name={t('foodListScreen.tabTitle')}>
        {() => <FoodListScreen onFoodChange={handleFoodChange} key={i18n.locale} />}
      </Tab.Screen>
      <Tab.Screen name={t('settingsScreen.title')}>
        {/* Pass onLocaleChange to SettingsScreen */}
        {() => <SettingsScreen onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} onDataOperation={() => console.log("Data operation in AppNav")} key={i18n.locale} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default AppNavigator;