// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storageService';
import * as authService from '../services/authService';
import { getUserStatus } from '../services/backendService';
import { Settings, LanguageCode } from '../types/settings';
import { Token } from '../types/token';
import { User } from '../types/user';

export interface AuthState {
  authenticated: boolean;
  token: string | null;
}

export interface AuthContextType {
  authState: AuthState;
  settings: Settings;
  user: User | null;
  isLoading: boolean;
  login: (tokenData: Token) => Promise<void>;
  logout: () => Promise<void>;
  changeTheme: (theme: 'light' | 'dark' | 'system') => void;
  changeLocale: (locale: LanguageCode) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<Partial<AuthContextType>>({});

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const status = await getUserStatus();
      setUser(status);
    } catch (e) {
      console.warn("Could not refresh user status in AuthContext", e);
      // Don't nullify user on a failed refresh, might be a network blip
    }
  }, []);

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const tokenData = await authService.getAuthToken();
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);

        if (tokenData?.access_token) {
          setAuthState({ authenticated: true, token: tokenData.access_token });
          // refreshUser is now handled by the dedicated useEffect below
        }
      } catch (e) {
        console.error("Failed to load auth data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []); // This effect runs once on mount

  // This new useEffect handles refreshing the user whenever the authentication state becomes true.
  // This decouples the user fetch from the login and initial load logic, making the flow more robust.
  useEffect(() => {
    if (authState.authenticated && authState.token) {
      refreshUser();
    }
  }, [authState.authenticated, authState.token, refreshUser]);

  const login = async (tokenData: Token) => {
    await authService.setAuthToken(tokenData);
    // Only update the state. The side effect of refreshing the user is handled by the useEffect above.
    setAuthState({ authenticated: true, token: tokenData.access_token });
  };

  const logout = async () => {
    await authService.logoutUser();
    setAuthState({ authenticated: false, token: null });
    setUser(null);
  };

  const changeTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    setSettings(prev => {
        const newSettings = { ...prev, theme };
        saveSettings(newSettings);
        return newSettings;
    });
  }, []);

  const changeLocale = useCallback(async (locale: LanguageCode) => {
    setSettings(prev => {
        const newSettings = { ...prev, language: locale };
        saveSettings(newSettings);
        return newSettings;
    });
  }, []);

  const value: AuthContextType = {
    authState,
    settings,
    user,
    isLoading,
    login,
    logout,
    changeTheme,
    changeLocale,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};