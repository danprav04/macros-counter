// __tests__/screens/ForgotPasswordScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import ForgotPasswordScreen from 'screens/ForgotPasswordScreen';
import * as authService from 'services/authService';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

jest.mock('services/authService');
jest.spyOn(Alert, 'alert');

const mockedRequestPasswordReset = authService.requestPasswordReset as jest.Mock;
const Stack = createNativeStackNavigator();

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="ForgotPassword" component={() => children as React.ReactElement} />
                <Stack.Screen name="Login" component={() => <></>} />
            </Stack.Navigator>
        </NavigationContainer>
    </ThemeProvider>
);


describe('ForgotPasswordScreen', () => {

  it('renders the form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />, { wrapper: TestWrapper });
    expect(getByText('Reset Password')).toBeTruthy();
    expect(getByPlaceholderText('Email Address')).toBeTruthy();
  });

  it('shows an alert if email is empty', () => {
    const { getByText } = render(<ForgotPasswordScreen />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Send Reset Link'));
    expect(Alert.alert).toHaveBeenCalledWith('Email Required', expect.any(String));
  });

  it('calls requestPasswordReset service on valid submission', async () => {
    mockedRequestPasswordReset.mockResolvedValue({ message: 'Email has been sent' });
    const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />, { wrapper: TestWrapper });
    
    fireEvent.changeText(getByPlaceholderText('Email Address'), 'test@test.com');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
        expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@test.com');
        expect(Alert.alert).toHaveBeenCalledWith('Check Your Email', 'Email has been sent', expect.any(Array));
    });
  });
});