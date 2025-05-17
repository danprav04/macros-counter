// src/navigation/AppNavigator.tsx
// navigation/AppNavigator.tsx
import React, { useState, useCallback } from 'react';
import { Platform, I18nManager } from 'react-native';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon, useTheme } from '@rneui/themed';
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen'; // Import new screen
import { LanguageCode, Settings } from '../types/settings';
import i18n, { t } from '../localization/i18n';
import { Food } from '../types/food'; // Import Food type

// Define ParamList for the Tab Navigator
export type MainTabParamList = {
  DailyEntryRoute: { quickAddFood?: Food }; // For DailyEntryScreen, can receive quickAddFood
  FoodListRoute: { openAddFoodModal?: boolean };   // For FoodListScreen
  SettingsStackRoute: undefined;             // For the Settings Stack
};

// Define ParamList for the Settings Stack
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Questionnaire: undefined;
};


const Tab = createBottomTabNavigator<MainTabParamList>();
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();

interface AppNavigatorProps {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onLocaleChange: (locale: LanguageCode) => void;
}

// Settings Stack Navigator
function SettingsStackNavigatorComponent({ onThemeChange, onLocaleChange }: AppNavigatorProps) {
  const { theme } = useTheme();
  return (
    <SettingsStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: { color: theme.colors.text },
        headerTintColor: theme.colors.primary,
        headerTitleAlign: Platform.OS === 'ios' ? 'center' : 'center',
      }}
    >
      <SettingsStackNav.Screen name="SettingsHome" options={{ title: t('settingsScreen.title') }}>
        {() => <SettingsScreen onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} onDataOperation={() => console.log("Data operation in AppNav")} />}
      </SettingsStackNav.Screen>
      <SettingsStackNav.Screen name="Questionnaire" options={{ title: t('questionnaireScreen.title') }}>
        {() => <QuestionnaireScreen />}
      </SettingsStackNav.Screen>
    </SettingsStackNav.Navigator>
  );
}


const AppNavigator: React.FC<AppNavigatorProps> = ({ onThemeChange, onLocaleChange }) => {
  const { theme } = useTheme();
  const [foodListRefresh, setFoodListRefresh] = useState(false);

  const handleFoodChange = useCallback(() => {
    setFoodListRefresh(prev => !prev);
  }, []);

  // Use static route names for consistency
  const dailyEntryRouteName: keyof MainTabParamList = 'DailyEntryRoute';
  const foodListRouteName: keyof MainTabParamList = 'FoodListRoute';
  const settingsStackRouteName: keyof MainTabParamList = 'SettingsStackRoute';


  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';
          let type: string = 'ionicon'; // Default type

          if (route.name === dailyEntryRouteName) {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === foodListRouteName) {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === settingsStackRouteName) { 
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
      <Tab.Screen
        name={dailyEntryRouteName}
        options={{ title: t('dailyEntryScreen.tabTitle') }}
      >
        {() => <DailyEntryScreen key={`${foodListRefresh}-${i18n.locale}`} />}
      </Tab.Screen>
      <Tab.Screen
        name={foodListRouteName}
        options={{ title: t('foodListScreen.tabTitle') }}
      >
        {() => <FoodListScreen onFoodChange={handleFoodChange} key={i18n.locale} />}
      </Tab.Screen>
      <Tab.Screen
        name={settingsStackRouteName} 
        options={{ title: t('settingsScreen.title') }} 
      >
        {() => <SettingsStackNavigatorComponent onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default AppNavigator;