// navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, Icon } from '@rneui/themed'; // Import useTheme
import DailyEntryScreen from '../screens/DailyEntryScreen';
import FoodListScreen from '../screens/FoodListScreen';
import SettingsScreen from '../screens/SettingsScreen';


const Tab = createBottomTabNavigator();

interface AppNavigatorProps {
    onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ onThemeChange }) => {
    const { theme } = useTheme(); // Use the theme

    return (
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
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.background
                }

            })}
        >
            <Tab.Screen name="Daily Entry" component={DailyEntryScreen} />
            <Tab.Screen name="Foods" component={FoodListScreen} />
            <Tab.Screen name="Settings" component={() => <SettingsScreen onThemeChange={onThemeChange} />} />
        </Tab.Navigator>
    );
};

export default AppNavigator;