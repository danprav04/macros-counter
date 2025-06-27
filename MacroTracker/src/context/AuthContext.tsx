import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storageService';
import { getAuthToken, removeAuthToken, setAuthToken } from '../services/authService';
import { Settings, LanguageCode } from '../types/settings';

export interface AuthState {
  authenticated: boolean;
  token: string | null;
}

export interface AuthContextType {
  authState: AuthState;
  settings: Settings;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
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
        const token = await getAuthToken();
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);

        if (token) {
          setAuthState({ authenticated: true, token });
        }
      } catch (e) {
        console.error("Failed to load auth data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  const login = async (token: string) => {
    await setAuthToken(token);
    setAuthState({ authenticated: true, token });
  };

  const logout = async () => {
    await removeAuthToken();
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