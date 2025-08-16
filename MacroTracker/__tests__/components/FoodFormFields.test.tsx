// __tests__/components/FoodFormFields.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import FoodFormFields from 'components/FoodFormFields';

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockProps = {
  values: { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  errors: {},
  onInputChange: jest.fn(),
  isEditing: false,
  disabled: false,
};

describe('FoodFormFields', () => {
  it('renders all fields with initial values', () => {
    const { getByDisplayValue, getByText } = render(<FoodFormFields {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Food Name')).toBeTruthy();
    expect(getByDisplayValue('Apple')).toBeTruthy();
    expect(getByDisplayValue('52')).toBeTruthy();
    expect(getByDisplayValue('0.3')).toBeTruthy();
  });

  it('displays error messages when passed in props', () => {
    const errors = { name: 'Name is required' };
    const { getByText } = render(<FoodFormFields {...mockProps} errors={errors} />, { wrapper: TestWrapper });
    expect(getByText('Name is required')).toBeTruthy();
  });

  it('calls onInputChange when a field is changed', () => {
    const { getByDisplayValue } = render(<FoodFormFields {...mockProps} />, { wrapper: TestWrapper });
    const nameInput = getByDisplayValue('Apple');
    fireEvent.changeText(nameInput, 'New Apple');
    expect(mockProps.onInputChange).toHaveBeenCalledWith('name', 'New Apple', false);
    
    const caloriesInput = getByDisplayValue('52');
    fireEvent.changeText(caloriesInput, '60');
    expect(mockProps.onInputChange).toHaveBeenCalledWith('calories', '60', false);
  });

  it('disables all inputs when disabled prop is true', () => {
    const { getByDisplayValue } = render(<FoodFormFields {...mockProps} disabled={true} />, { wrapper: TestWrapper });
    expect(getByDisplayValue('Apple').props.editable).toBe(false);
    expect(getByDisplayValue('52').props.editable).toBe(false);
  });
});