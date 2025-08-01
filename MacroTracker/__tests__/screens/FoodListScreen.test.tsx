// __tests__/screens/FoodListScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import FoodListScreen from '../../src/screens/FoodListScreen';
import { getFoods, deleteFood } from '../../src/services/foodService';
import { lightThemeColors } from '../../src/navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as foodIconMatcher from '../../src/utils/foodIconMatcher';

jest.mock('services/foodService');
jest.mock('expo-constants', () => ({
    ...jest.requireActual('expo-constants'),
    expoConfig: {
        extra: {
            env: { BACKEND_URL_PRODUCTION: 'https://macros-vision-ai.xyz' }
        }
    }
}));
jest.mock('../../src/utils/foodIconMatcher');

const mockedGetFoods = getFoods as jest.Mock;
const mockedDeleteFood = deleteFood as jest.Mock;

const mockFoods = [
  { id: '1', name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '2023-01-01T12:00:00.000Z' },
  { id: '2', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, createdAt: '2023-01-02T12:00:00.000Z' },
];

const theme = createTheme({
    lightColors: lightThemeColors,
    darkColors: {},
});

const Tab = createBottomTabNavigator();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
      <NavigationContainer>
          <Tab.Navigator>
              <Tab.Screen name="FoodListRoute" component={() => children as React.ReactElement} />
              <Tab.Screen name="DailyEntryRoute" component={() => <></>} />
          </Tab.Navigator>
      </NavigationContainer>
  </ThemeProvider>
);

describe('FoodListScreen', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetFoods.mockResolvedValue({ items: mockFoods, total: mockFoods.length });
        (foodIconMatcher.findBestIcon as jest.Mock).mockReturnValue('🍎');
    });

    it('renders loading state initially', () => {
        mockedGetFoods.mockReturnValue(new Promise(() => {})); // Prevent promise from resolving
        const { getByText } = render(<FoodListScreen />, { wrapper: TestWrapper });
        expect(getByText('Loading Foods...')).toBeTruthy();
    });

    it('renders the list of foods after loading', async () => {
        const { findByText } = render(<FoodListScreen />, { wrapper: TestWrapper });
        expect(await findByText('Apple')).toBeTruthy();
        expect(await findByText('Banana')).toBeTruthy();
    });

    it('filters the list based on search input', async () => {
        const { getByPlaceholderText, getByText, queryByText } = render(<FoodListScreen />, { wrapper: TestWrapper });
        await waitFor(() => expect(getByText('Apple')).toBeTruthy());

        const searchBar = getByPlaceholderText('Search Your Food Library...');
        fireEvent.changeText(searchBar, 'Bana');

        await waitFor(() => {
            expect(queryByText('Apple')).toBeNull();
            expect(getByText('Banana')).toBeTruthy();
        });
    });

    it('shows an empty state message when no foods are available', async () => {
        mockedGetFoods.mockResolvedValue({ items: [], total: 0 });
        const { findByText } = render(<FoodListScreen />, { wrapper: TestWrapper });
        expect(await findByText('Your food library is empty.')).toBeTruthy();
    });

    it('opens the AddFoodModal when the FAB is pressed', async () => {
        const { findByText, getByTestId } = render(<FoodListScreen />, { wrapper: TestWrapper });
        await findByText('Apple'); // wait for list to load

        // The FAB component from RNEUI renders a touchable with a role of "button"
        const fabButton = getByTestId('RNE_FAB');
        fireEvent.press(fabButton);

        // Check if the modal title is now visible
        await waitFor(() => expect(findByText('Add New Food')).toBeTruthy());
    });
});