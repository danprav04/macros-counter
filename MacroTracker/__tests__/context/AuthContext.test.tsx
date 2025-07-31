// __tests__/context/AuthContext.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, Button, View } from 'react-native';
import { AuthProvider, useAuth, AuthContextType } from 'context/AuthContext';
import * as storageService from 'services/storageService';
import * as authService from 'services/authService';
import { Settings } from 'types/settings';
import { Token } from 'types/token';

jest.mock('services/storageService');
jest.mock('services/authService');

const mockedLoadSettings = storageService.loadSettings as jest.Mock;
const mockedSaveSettings = storageService.saveSettings as jest.Mock;
const mockedGetAuthToken = authService.getAuthToken as jest.Mock;
const mockedSetAuthToken = authService.setAuthToken as jest.Mock;
const mockedLogoutUser = authService.logoutUser as jest.Mock;

const mockSettings: Settings = {
  theme: 'system', language: 'en', dailyGoals: { calories: 2000, protein: 150, carbs: 200, fat: 70 }, settingsHistory: []
};
const mockToken: Token = { access_token: 'abc', refresh_token: 'xyz', token_type: 'bearer' };


const TestConsumer: React.FC = () => {
  const { authState, settings, isLoading, login, logout, changeTheme, changeLocale } = useAuth() as AuthContextType;

  return (
    <View>
      <Text testID="loading">{isLoading ? 'Loading' : 'Loaded'}</Text>
      <Text testID="authenticated">{authState.authenticated ? 'Yes' : 'No'}</Text>
      <Text testID="token">{authState.token || 'None'}</Text>
      <Text testID="theme">{settings.theme}</Text>
      <Text testID="language">{settings.language}</Text>
      <Button title="Login" onPress={() => login(mockToken)} />
      <Button title="Logout" onPress={() => logout()} />
      <Button title="Change Theme" onPress={() => changeTheme('dark')} />
      <Button title="Change Language" onPress={() => changeLocale('he')} />
    </View>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadSettings.mockResolvedValue(mockSettings);
  });

  it('should initialize in a loading state, then load token and settings', async () => {
    mockedGetAuthToken.mockResolvedValue(mockToken);
    
    const { getByTestId, findByText } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(getByTestId('loading')).toHaveTextContent('Loading');
    
    await findByText('Loaded');

    expect(getByTestId('authenticated')).toHaveTextContent('Yes');
    expect(getByTestId('token')).toHaveTextContent('abc');
    expect(getByTestId('theme')).toHaveTextContent('system');
  });

  it('should initialize as unauthenticated if no token is found', async () => {
    mockedGetAuthToken.mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('loading')).toHaveTextContent('Loaded'));
    
    expect(getByTestId('authenticated')).toHaveTextContent('No');
    expect(getByTestId('token')).toHaveTextContent('None');
  });

  it('should handle login correctly', async () => {
     mockedGetAuthToken.mockResolvedValue(null); // start as logged out
     const { getByText, getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
     
    await waitFor(() => expect(getByTestId('loading')).toHaveTextContent('Loaded'));
    expect(getByTestId('authenticated')).toHaveTextContent('No');

    await act(async () => {
        fireEvent.press(getByText('Login'));
    });
    
    expect(mockedSetAuthToken).toHaveBeenCalledWith(mockToken);
    expect(getByTestId('authenticated')).toHaveTextContent('Yes');
    expect(getByTestId('token')).toHaveTextContent('abc');
  });

  it('should handle logout correctly', async () => {
    mockedGetAuthToken.mockResolvedValue(mockToken); // start as logged in
    const { getByText, getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('loading')).toHaveTextContent('Loaded'));
    expect(getByTestId('authenticated')).toHaveTextContent('Yes');
    
    await act(async () => {
        fireEvent.press(getByText('Logout'));
    });
    
    expect(mockedLogoutUser).toHaveBeenCalled();
    expect(getByTestId('authenticated')).toHaveTextContent('No');
    expect(getByTestId('token')).toHaveTextContent('None');
  });

  it('should handle theme change correctly', async () => {
    mockedGetAuthToken.mockResolvedValue(null);
    const { getByText, getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading')).toHaveTextContent('Loaded'));
    
    await act(async () => {
      fireEvent.press(getByText('Change Theme'));
    });

    expect(getByTestId('theme')).toHaveTextContent('dark');
    expect(mockedSaveSettings).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('should handle locale change correctly', async () => {
    mockedGetAuthToken.mockResolvedValue(null);
    const { getByText, getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading')).toHaveTextContent('Loaded'));
    
    await act(async () => {
      fireEvent.press(getByText('Change Language'));
    });
    
    expect(getByTestId('language')).toHaveTextContent('he');
    expect(mockedSaveSettings).toHaveBeenCalledWith(expect.objectContaining({ language: 'he' }));
  });
});