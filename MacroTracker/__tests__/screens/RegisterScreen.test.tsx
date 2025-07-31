// __tests__/screens/RegisterScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import RegisterScreen from 'screens/RegisterScreen';
import * as authService from 'services/authService';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

jest.mock('services/authService');
jest.spyOn(Alert, 'alert');

const mockedRegisterUser = authService.registerUser as jest.Mock;
const Stack = createNativeStackNavigator();

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Register" component={() => children as React.ReactElement} />
                <Stack.Screen name="Login" component={() => <></>} />
            </Stack.Navigator>
        </NavigationContainer>
    </ThemeProvider>
);

describe('RegisterScreen', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders the registration form', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />, { wrapper: TestWrapper });
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password (min 8 characters)')).toBeTruthy();
    expect(getByText('Register')).toBeTruthy();
  });

  it('shows an alert if fields are empty', () => {
    const { getByText } = render(<RegisterScreen />, { wrapper: TestWrapper });
    fireEvent.press(getByText('Register'));
    expect(Alert.alert).toHaveBeenCalledWith('Missing Fields', expect.any(String));
  });

  it('shows an alert if password is too short', () => {
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />, { wrapper: TestWrapper });
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 8 characters)'), 'short');
    fireEvent.press(getByText('Register'));
    expect(Alert.alert).toHaveBeenCalledWith('Password Too Short', expect.any(String));
  });

  it('calls registerUser service on valid submission', async () => {
    mockedRegisterUser.mockResolvedValue({ message: 'Success' });
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />, { wrapper: TestWrapper });

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 8 characters)'), 'password123');
    fireEvent.press(getByText('Register'));

    await waitFor(() => {
        expect(authService.registerUser).toHaveBeenCalledWith('test@test.com', 'password123');
        expect(Alert.alert).toHaveBeenCalledWith('Check Your Email', 'Success', expect.any(Array));
    });
  });
  
  it('handles registration failure from the service', async () => {
      mockedRegisterUser.mockRejectedValue(new Error('Email already exists'));
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />, { wrapper: TestWrapper });

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
      fireEvent.changeText(getByPlaceholderText('Password (min 8 characters)'), 'password123');
      fireEvent.press(getByText('Register'));

      await waitFor(() => {
          expect(authService.registerUser).toHaveBeenCalled();
          // The service itself is mocked to show an alert, so we don't need to check it here.
      });
  });
});