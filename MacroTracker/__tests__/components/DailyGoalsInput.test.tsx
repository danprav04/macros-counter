// __tests__/components/DailyGoalsInput.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import DailyGoalsInput from 'components/DailyGoalsInput';

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockProps = {
  dailyGoals: { calories: 2000, protein: 150, carbs: 200, fat: 70 },
  onGoalChange: jest.fn(),
};

describe('DailyGoalsInput', () => {
  it('renders inputs with correct labels and initial values', () => {
    const { getByDisplayValue, getByText } = render(<DailyGoalsInput {...mockProps} />, { wrapper: TestWrapper });

    expect(getByText('Calories Goal')).toBeTruthy();
    expect(getByDisplayValue('2000')).toBeTruthy();

    expect(getByText('Protein Goal')).toBeTruthy();
    expect(getByDisplayValue('150')).toBeTruthy();
  });

  it('calls onGoalChange with correct parameters when calories are changed', () => {
    const { getByDisplayValue } = render(<DailyGoalsInput {...mockProps} />, { wrapper: TestWrapper });
    const caloriesInput = getByDisplayValue('2000');
    fireEvent.changeText(caloriesInput, '2100');
    expect(mockProps.onGoalChange).toHaveBeenCalledWith('calories', '2100');
  });

  it('calls onGoalChange with correct parameters when protein is changed', () => {
    const { getByDisplayValue } = render(<DailyGoalsInput {...mockProps} />, { wrapper: TestWrapper });
    const proteinInput = getByDisplayValue('150');
    fireEvent.changeText(proteinInput, '160');
    expect(mockProps.onGoalChange).toHaveBeenCalledWith('protein', '160');
  });
});