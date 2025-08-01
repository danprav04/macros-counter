// __tests__/components/ConfirmationModal.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { lightThemeColors } from '../../src/navigation/AppNavigator';

// Mock translation function
jest.mock('../../src/localization/i18n', () => ({
    t: (key: string) => {
        const translations: { [key: string]: string } = {
            'confirmationModal.confirm': 'Confirm',
            'confirmationModal.cancel': 'Cancel'
        };
        return translations[key] || key;
    }
}));


const theme = createTheme({
    lightColors: lightThemeColors,
    darkColors: {}, // Not needed for this test
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('ConfirmationModal', () => {
  const mockProps = {
    isVisible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    confirmationText: '',
    setConfirmationText: jest.fn(),
    title: 'Test Title',
    message: 'Test message',
    inputPlaceholder: 'Type here'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with given props', () => {
    const { getByText, getByPlaceholderText } = render(<ConfirmationModal {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test message')).toBeTruthy();
    expect(getByPlaceholderText('Type here')).toBeTruthy();
  });

  it('disables the confirm button when confirmationText is empty', () => {
    const { getByText } = render(<ConfirmationModal {...mockProps} confirmationText="" />, { wrapper: TestWrapper });
    const confirmButton = getByText('Confirm');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
  });

  it('enables the confirm button when confirmationText is not empty', () => {
    const { getByText } = render(<ConfirmationModal {...mockProps} confirmationText="CONFIRM" />, { wrapper: TestWrapper });
    const confirmButton = getByText('Confirm');
    expect(confirmButton.props.accessibilityState.disabled).toBe(false);
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    const { getByText } = render(<ConfirmationModal {...mockProps} confirmationText="CONFIRM" />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Confirm'));
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is pressed', () => {
    const { getByText } = render(<ConfirmationModal {...mockProps} />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Cancel'));
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls setConfirmationText when the input text changes', () => {
    const { getByPlaceholderText } = render(<ConfirmationModal {...mockProps} />, { wrapper: TestWrapper });
    fireEvent.changeText(getByPlaceholderText('Type here'), 'new text');
    expect(mockProps.setConfirmationText).toHaveBeenCalledWith('new text');
  });
});