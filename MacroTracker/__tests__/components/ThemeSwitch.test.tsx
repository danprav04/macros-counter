// __tests__/components/ThemeSwitch.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import ThemeSwitch from 'components/ThemeSwitch';

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockProps = {
  currentTheme: 'light' as const,
  onToggle: jest.fn(),
};

describe('ThemeSwitch', () => {
  it('is off when current theme is light', () => {
    const { getByRole } = render(<ThemeSwitch {...mockProps} />, { wrapper: TestWrapper });
    const switchControl = getByRole('switch');
    expect(switchControl.props.value).toBe(false);
  });

  it('is on when current theme is dark', () => {
    const { getByRole } = render(<ThemeSwitch {...mockProps} currentTheme="dark" />, { wrapper: TestWrapper });
    const switchControl = getByRole('switch');
    expect(switchControl.props.value).toBe(true);
  });

  it('calls onToggle with "dark" when toggled on', () => {
    const { getByRole } = render(<ThemeSwitch {...mockProps} currentTheme="light" />, { wrapper: TestWrapper });
    const switchControl = getByRole('switch');
    fireEvent(switchControl, 'onValueChange', true);
    expect(mockProps.onToggle).toHaveBeenCalledWith('dark');
  });

  it('calls onToggle with "light" when toggled off', () => {
    const { getByRole } = render(<ThemeSwitch {...mockProps} currentTheme="dark" />, { wrapper: TestWrapper });
    const switchControl = getByRole('switch');
    fireEvent(switchControl, 'onValueChange', false);
    expect(mockProps.onToggle).toHaveBeenCalledWith('light');
  });
});