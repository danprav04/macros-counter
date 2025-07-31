// __tests__/components/AccountSettings.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import AccountSettings from 'components/AccountSettings';

const theme = createTheme({
    lightColors: {
        primary: '#2e86de',
        warning: '#ffc107',
        success: '#28a745',
        text: '#000',
        background: '#fff',
        grey3: '#ccc'
    }
});

const mockProps = {
  userCoins: 100,
  isLoadingCoins: false,
  isAddingCoins: false,
  onAddTestCoins: jest.fn(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock __DEV__ global variable
// In one file (e.g., your jest-setup.js or a specific test file)
Object.defineProperty(global, '__DEV__', {
  value: true,
  configurable: true,
});

describe('AccountSettings', () => {
  it('renders the coin balance correctly', () => {
    const { getByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Coin Balance')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
  });
  
  it('shows N/A when userCoins is null', () => {
      const { getByText } = render(<AccountSettings {...mockProps} userCoins={null} />, { wrapper: TestWrapper });
      expect(getByText('N/A')).toBeTruthy();
  });

  it('shows an activity indicator when loading coins', () => {
    const { getByTestId, queryByText } = render(<AccountSettings {...mockProps} isLoadingCoins={true} />, { wrapper: TestWrapper });
    // In React Native, ActivityIndicator doesn't have a standard testID.
    // We check that the coin value is NOT rendered.
    expect(queryByText('100')).toBeNull();
  });

  it('renders the "Add Test Coins" button in development', () => {
    const { getByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Add 10 Coins (Test)')).toBeTruthy();
    expect(getByText(/Note: The "Add Coins" button is for testing/)).toBeTruthy();
  });
  
  it('does not render the "Add Test Coins" button in production', () => {
      Object.defineProperty(global, '__DEV__', { value: false });
      const { queryByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
      expect(queryByText('Add 10 Coins (Test)')).toBeNull();
      Object.defineProperty(global, '__DEV__', { value: true }); // Reset for other tests
  });

  it('calls onAddTestCoins when the button is pressed', () => {
    const { getByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Add 10 Coins (Test)'));
    expect(mockProps.onAddTestCoins).toHaveBeenCalled();
  });

  it('disables the button when adding coins', () => {
    const { getByText } = render(<AccountSettings {...mockProps} isAddingCoins={true} />, { wrapper: TestWrapper });
    const button = getByText('Add 10 Coins (Test)');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});