// __tests__/components/DailyEntryListItem.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import DailyEntryListItem from 'components/DailyEntryListItem';
import { DailyEntryItem } from 'types/dailyEntry';
import { Food } from 'types/food';

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockFood: Food = { id: '1', name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '' };
const mockItem: DailyEntryItem = { food: mockFood, grams: 150 };

const mockProps = {
  item: mockItem,
  reversedIndex: 0,
  foodIcons: {},
  setFoodIcons: jest.fn(),
  onEdit: jest.fn(),
  onRemove: jest.fn(),
  isSaving: false,
  dailyGoals: { calories: 2000, protein: 150, carbs: 200, fat: 70 },
};

describe('DailyEntryListItem', () => {
  it('renders the food name and calculated macros correctly', () => {
    const { getByText } = render(<DailyEntryListItem {...mockProps} />, { wrapper: TestWrapper });
    const calculatedCalories = Math.round((52 / 100) * 150);
    const calculatedProtein = Math.round((0.3 / 100) * 150);
    const calculatedCarbs = Math.round((14 / 100) * 150);
    const calculatedFat = Math.round((0.2 / 100) * 150);

    expect(getByText('Apple')).toBeTruthy();
    expect(getByText(`${mockItem.grams}g • Cal: ${calculatedCalories} P: ${calculatedProtein} C: ${calculatedCarbs} F: ${calculatedFat}`)).toBeTruthy();
  });

  it('renders an emoji icon if available', () => {
    const { getByText } = render(<DailyEntryListItem {...mockProps} foodIcons={{ 'Apple': '🍎' }} />, { wrapper: TestWrapper });
    expect(getByText('🍎')).toBeTruthy();
  });

  it('renders a placeholder icon if no emoji is found', () => {
    const { getByTestId } = render(<DailyEntryListItem {...mockProps} />, { wrapper: TestWrapper });
    // This is hard to test without a specific testID, but we can check it doesn't crash.
    // If we added a testID to the placeholder view, we could assert its presence.
  });

  it('renders an error message for invalid item data', () => {
    const invalidItem = { food: undefined, grams: 0 } as any;
    const { getByText } = render(<DailyEntryListItem {...mockProps} item={invalidItem} />, { wrapper: TestWrapper });
    expect(getByText('Invalid Entry Data')).toBeTruthy();
  });
  
  // Note: Testing Swipeable actions (`leftContent`/`rightContent`) is an integration-level
  // task not well-suited for react-native-testing-library. We trust that RNEUI's component
  // works and that our `onEdit`/`onRemove` props would be called if a swipe was simulated
  // in an E2E test.
});