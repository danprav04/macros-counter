// __tests__/components/DateNavigator.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import DateNavigator from 'components/DateNavigator';

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockProps = {
  selectedDate: '2025-07-31',
  onPreviousDay: jest.fn(),
  onNextDay: jest.fn(),
  onShowDatePicker: jest.fn(),
  isSaving: false,
  isLoadingData: false,
};

describe('DateNavigator', () => {
  it('renders the formatted date correctly', async () => {
    const { findByText } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    // The date formatting is async
    const dateText = await findByText('July 31, 2025');
    expect(dateText).toBeTruthy();
  });

  it('calls onPreviousDay when the back button is pressed', async () => {
    const { getByTestId, findAllByRole } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    // RNE buttons don't have a good default selector. Let's find by icon.
    // This is brittle. Adding testIDs to the buttons would be better.
    const buttons = await findAllByRole('button');
    fireEvent.press(buttons[0]); // Assuming first is back
    expect(mockProps.onPreviousDay).toHaveBeenCalled();
  });
  
  it('calls onNextDay when the forward button is pressed', async () => {
    const { findAllByRole } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    const buttons = await findAllByRole('button');
    fireEvent.press(buttons[1]); // Assuming second is forward
    expect(mockProps.onNextDay).toHaveBeenCalled();
  });

  it('calls onShowDatePicker when the date text is pressed', async () => {
    const { findByText } = render(<DateNavigator {...mockProps} />, { wrapper: TestWrapper });
    const dateText = await findByText('July 31, 2025');
    fireEvent.press(dateText);
    expect(mockProps.onShowDatePicker).toHaveBeenCalled();
  });

  it('disables buttons when isSaving is true', async () => {
    const { findAllByRole, findByText } = render(<DateNavigator {...mockProps} isSaving={true} />, { wrapper: TestWrapper });
    const buttons = await findAllByRole('button');
    const dateText = await findByText('July 31, 2025');

    expect(buttons[0].props.accessibilityState.disabled).toBe(true);
    expect(buttons[1].props.accessibilityState.disabled).toBe(true);
    expect(dateText.props.accessibilityState.disabled).toBe(true);
  });
});