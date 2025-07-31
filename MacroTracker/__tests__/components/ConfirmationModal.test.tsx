// __tests__/components/ConfirmationModal.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import ConfirmationModal from 'components/ConfirmationModal';

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockProps = {
  isVisible: true,
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
  confirmationText: '',
  setConfirmationText: jest.fn(),
  title: 'Test Title',
  message: 'Test Message',
  inputPlaceholder: 'Test Placeholder',
};

describe('ConfirmationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title, message, and placeholder', () => {
    const { getByText, getByPlaceholderText } = render(<ConfirmationModal {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Message')).toBeTruthy();
    expect(getByPlaceholderText('Test Placeholder')).toBeTruthy();
  });

  it('calls onCancel when the cancel button is pressed', () => {
    const { getByText } = render(<ConfirmationModal {...mockProps} />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Cancel'));
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
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

  it('calls setConfirmationText when input text changes', () => {
    const { getByPlaceholderText } = render(<ConfirmationModal {...mockProps} />, { wrapper: TestWrapper });
    const input = getByPlaceholderText('Test Placeholder');
    fireEvent.changeText(input, 'New Text');
    expect(mockProps.setConfirmationText).toHaveBeenCalledWith('New Text');
  });
});