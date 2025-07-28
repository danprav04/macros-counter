import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storageService';
import * as authService from '../services/authService';
import { Settings, LanguageCode } from '../types/settings';
import { Token } from '../types/token';

export interface AuthState {
  authenticated: boolean;
  token: string | null;
}

export interface AuthContextType {
  authState: AuthState;
  settings: Settings;
  isLoading: boolean;
  login: (tokenData: Token) => Promise<void>;
  logout: () => Promise<void>;
  changeTheme: (theme: 'light' | 'dark' | 'system') => void;
  changeLocale: (locale: LanguageCode) => void;
}

const AuthContext = createContext<Partial<AuthContextType>>({});

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false, token: null });
  const [settings, setSettings] = useState<Settings>({
    theme: 'system',
    language: 'system',
    dailyGoals: { calories: 2000, protein: 150, carbs: 200, fat: 70 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const tokenData = await authService.getAuthToken();
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);

        if (tokenData?.access_token) {
          setAuthState({ authenticated: true, token: tokenData.access_token });
        }
      } catch (e) {
        console.error("Failed to load auth data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  const login = async (tokenData: Token) => {
    await authService.setAuthToken(tokenData);
    setAuthState({ authenticated: true, token: tokenData.access_token });
  };

  const logout = async () => {
    await authService.logoutUser(); // This clears tokens and calls backend
    setAuthState({ authenticated: false, token: null });
  };

  const changeTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  const changeLocale = useCallback(async (locale: LanguageCode) => {
    const newSettings = { ...settings, language: locale };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  const value: AuthContextType = {
    authState,
    settings,
    isLoading,
    login,
    logout,
    changeTheme,
    changeLocale,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};