// __tests__/components/DateNavigator.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import DateNavigator from '../../src/components/DateNavigator';
import { lightThemeColors } from '../../src/navigation/AppNavigator';

// Mock i18n
jest.mock('../../src/localization/i18n', () => ({
  t: (key: string) => key,
  i18n: { locale: 'en' }
}));

// Mock dateUtils
jest.mock('../../src/utils/dateUtils', () => ({
  formatDateReadableAsync: jest.fn(async (date) => {
    if (!date) return 'Invalid Date';
    // Provide a simple, predictable format for testing
    const d = new Date(date);
    return `${d.toLocaleString('default', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
  }),
}));

const theme = createTheme({
  lightColors: lightThemeColors,
  darkColors: {},
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('DateNavigator', () => {
  const mockProps = {
    selectedDate: '2023-10-27',
    onPreviousDay: jest.fn(),
    onNextDay: jest.fn(),
    onShowDatePicker: jest.fn(),
    isSaving: false,
    isLoadingData: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the formatted date correctly', async () => {
    const { findByText } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    const dateText = await findByText('October 27, 2023');
    expect(dateText).toBeTruthy();
  });

  it('calls onPreviousDay when the back button is pressed', async () => {
    const { findAllByRole } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    const buttons = await findAllByRole('button');
    fireEvent.press(buttons[0]); // First button is previous day
    expect(mockProps.onPreviousDay).toHaveBeenCalledTimes(1);
  });

  it('calls onNextDay when the forward button is pressed', async () => {
    const { findAllByRole } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    const buttons = await findAllByRole('button');
    fireEvent.press(buttons[1]); // Second button is next day
    expect(mockProps.onNextDay).toHaveBeenCalledTimes(1);
  });

  it('calls onShowDatePicker when the date text is pressed', async () => {
    const { findByText } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    const dateText = await findByText('October 27, 2023');
    fireEvent.press(dateText);
    expect(mockProps.onShowDatePicker).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isSaving is true', async () => {
    const { findAllByRole, findByText } = render(<DateNavigator {...mockProps} isSaving={true} />, { wrapper: TestWrapper });
    const buttons = await findAllByRole('button');
    const dateText = await findByText('October 27, 2023');

    expect(buttons[0].props.accessibilityState.disabled).toBe(true);
    expect(buttons[1].props.accessibilityState.disabled).toBe(true);
    expect(dateText.props.accessibilityState.disabled).toBe(true);
  });
});