// __tests__/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext, AuthContextType } from '../../src/context/AuthContext';
import LoginScreen from '../../src/screens/LoginScreen';
import * as authService from '../../src/services/authService';

// Mock the entire authService module
jest.mock('../../src/services/authService');
const mockedLoginUser = authService.loginUser as jest.Mock;

// Define a minimal theme for the ThemeProvider
const theme = createTheme({
  lightColors: {
    primary: '#2e86de',
    secondary: '#adb5bd',
    background: '#f8f9fa',
    grey3: '#ced4da',
    text: '#212529',
  },
});

// Mock the navigation object
const mockNavigation = {
  navigate: jest.fn(),
};

// A helper function to render the component with all necessary providers
const renderLoginScreen = (authContextValue: Partial<AuthContextType>) => {
  // Mock the useNavigation hook to return our mock object
  jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue(mockNavigation);

  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={authContextValue}>
        <NavigationContainer>
          <LoginScreen />
        </NavigationContainer>
      </AuthContext.Provider>
    </ThemeProvider>
  );
};

describe('<LoginScreen />', () => {
  let mockLogin: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockLogin = jest.fn();
  });

  it('renders email, password inputs, and login button', () => {
    const { getByPlaceholderText, getByText } = renderLoginScreen({ login: mockLogin });
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
  });

  it('allows typing in email and password fields', () => {
    const { getByPlaceholderText } = renderLoginScreen({ login: mockLogin });
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('calls login service and context on successful login', async () => {
    const mockToken = { access_token: 'abc-123', refresh_token: 'def-456', token_type: 'bearer' };
    mockedLoginUser.mockResolvedValue(mockToken);

    const { getByText, getByPlaceholderText } = renderLoginScreen({ login: mockLogin });
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    // Wait for async operations to complete
    await waitFor(() => {
      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockLogin).toHaveBeenCalledWith(mockToken);
    });
  });

  it('does not call login context if service throws an error', async () => {
    // The authService itself shows an alert, so we just check the side effects
    mockedLoginUser.mockRejectedValue(new Error('Invalid credentials'));

    const { getByText, getByPlaceholderText } = renderLoginScreen({ login: mockLogin });
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(authService.loginUser).toHaveBeenCalledTimes(1);
    });
    // The crucial check: ensure the app's login state is not updated
    expect(mockLogin).not.toHaveBeenCalled();
  });

   it('navigates to Register screen when "Sign Up" is pressed', () => {
    const { getByText } = renderLoginScreen({ login: mockLogin });
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to ForgotPassword screen when "Forgot Password?" is pressed', () => {
    const { getByText } = renderLoginScreen({ login: mockLogin });
    fireEvent.press(getByText('Forgot Password?'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });
});