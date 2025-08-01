// __tests__/components/AccountSettings.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import AccountSettings from '../../src/components/AccountSettings';
import { lightThemeColors } from '../../src/navigation/AppNavigator';

// Mock translation function
jest.mock('../../src/localization/i18n', () => ({
    t: (key: string, params?: object) => {
        const translations: { [key: string]: string } = {
            'accountSettings.coinBalance': 'Coin Balance',
            'accountSettings.addTestCoins': 'Add 10 Coins (Test)',
            'accountSettings.testButtonWarning': 'Note: Test button',
            'accountSettings.notApplicable': 'N/A'
        };
        return translations[key] || key;
    }
}));


const theme = createTheme({
    lightColors: lightThemeColors,
    darkColors: {},
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('AccountSettings', () => {
  const mockProps = {
    userCoins: 100,
    isLoadingCoins: false,
    isAddingCoins: false,
    onAddTestCoins: jest.fn(),
  };

  beforeEach(() => {
    // Hide the __DEV__ warning in tests
    (global as any).__DEV__ = true;
    jest.clearAllMocks();
  });

  it('renders coin balance correctly', () => {
    const { getByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Coin Balance')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
  });

  it('shows loading indicator when loading coins', () => {
    const { getByTestId, queryByText } = render(<AccountSettings {...mockProps} isLoadingCoins={true} />, { wrapper: TestWrapper });
    // This is a common way to test for ActivityIndicator. RNEUI might give it a testID.
    // If not, we check that the text value is NOT present.
    expect(queryByText('100')).toBeNull();
  });

  it('shows N/A when userCoins is null', () => {
    const { getByText } = render(<AccountSettings {...mockProps} userCoins={null} />, { wrapper: TestWrapper });
    expect(getByText('N/A')).toBeTruthy();
  });

  it('renders the "Add Test Coins" button in dev mode', () => {
    const { getByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    expect(getByText('Add 10 Coins (Test)')).toBeTruthy();
    expect(getByText('Note: Test button')).toBeTruthy();
  });

  it('does NOT render the "Add Test Coins" button in production', () => {
    (global as any).__DEV__ = false;
    const { queryByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    expect(queryByText('Add 10 Coins (Test)')).toBeNull();
  });

  it('calls onAddTestCoins when button is pressed', () => {
    const { getByText } = render(<AccountSettings {...mockProps} />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Add 10 Coins (Test)'));
    expect(mockProps.onAddTestCoins).toHaveBeenCalledTimes(1);
  });

  it('disables the button when adding coins', () => {
    const { getByText } = render(<AccountSettings {...mockProps} isAddingCoins={true} />, { wrapper: TestWrapper });
    const button = getByText('Add 10 Coins (Test)');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});