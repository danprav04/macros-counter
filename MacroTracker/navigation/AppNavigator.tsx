// navigation/AppNavigator.tsx (Modified to accept onDataOperation)
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, useTheme } from '@rneui/themed';
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

interface AppNavigatorProps {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onDataOperation: () => void; // Add this prop
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ onThemeChange, onDataOperation }) => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';
          let type: string = '';

          if (route.name === 'Daily Entry') {
            iconName = focused ? 'calendar' : 'calendar-outline';
            type = 'ionicon';
          } else if (route.name === 'Foods') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
            type = 'ionicon'; // Consistent icon set
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
            type = 'ionicon';
          }

          return <Icon name={iconName} type={type} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary, // Use secondary color
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.divider, // Add a subtle border
        },
        tabBarLabelStyle: {
          fontWeight: 'bold', // Make labels more prominent
        }
      })}
    >
      <Tab.Screen name="Daily Entry" component={DailyEntryScreen} />
      <Tab.Screen name="Foods" component={FoodListScreen} />
      <Tab.Screen name="Settings">
        {/* Pass onDataOperation to SettingsScreen */}
        {() => <SettingsScreen onThemeChange={onThemeChange} onDataOperation={onDataOperation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default AppNavigator;