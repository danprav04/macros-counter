// src/navigation/AppNavigator.tsx
// navigation/AppNavigator.tsx
import React, { useState, useCallback } from 'react';
import { Platform, I18nManager } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon, useTheme } from '@rneui/themed';
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen'; // Import new screen
import { LanguageCode } from '../types/settings';
import i18n, { t } from '../localization/i18n';

const Tab = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();

interface AppNavigatorProps {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onLocaleChange: (locale: LanguageCode) => void;
}

// Settings Stack Navigator
function SettingsStackNavigator({ onThemeChange, onLocaleChange }: AppNavigatorProps) {
  const { theme } = useTheme();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: { color: theme.colors.text },
        headerTintColor: theme.colors.primary,
        // Corrected headerTitleAlign for iOS
        headerTitleAlign: Platform.OS === 'ios' ? 'center' : 'center',
      }}
    >
      <SettingsStack.Screen name="SettingsHome" options={{ title: t('settingsScreen.title') }}>
        {() => <SettingsScreen onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} onDataOperation={() => console.log("Data operation in AppNav")} />}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="Questionnaire" options={{ title: t('questionnaireScreen.title') }}>
        {() => <QuestionnaireScreen />}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
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
          } else if (route.name === "SettingsStack") { // Changed to check for Stack name
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Icon name={iconName} type={type} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        headerShown: false, // Header is managed by StackNavigator for Settings
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
      <Tab.Screen
        name="SettingsStack" // Name of the route for the stack
        options={{ title: t('settingsScreen.title') }} // Label for the tab
      >
        {() => <SettingsStackNavigator onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default AppNavigator;