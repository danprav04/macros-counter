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
  changeDailyGoals: (goals: Settings['dailyGoals']) => void;
  reloadSettings: () => Promise<void>;
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

  const reloadSettings = useCallback(async () => {
    const loadedSettings = await loadSettings();
    setSettings(loadedSettings);
  }, []);

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const tokenData = await authService.getAuthToken();
        await reloadSettings(); // Use the new function to load settings

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
  }, [reloadSettings]);

  useEffect(() => {
    if (authState.authenticated && authState.token) {
      refreshUser();
    }
  }, [authState.authenticated, authState.token, refreshUser]);

  const login = async (tokenData: Token) => {
    try {
      await authService.setAuthToken(tokenData);
      setAuthState({ authenticated: true, token: tokenData.access_token });
    } catch (error) {
      console.error("Login failed: Could not save the token.", error);
      // Do not update auth state if token saving fails. The alert from
      // tokenStorage will inform the user of the critical error.
      // We clear any potentially lingering bad state here.
      setAuthState({ authenticated: false, token: null });
      setUser(null);
    }
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

  const changeDailyGoals = useCallback((goals: Settings['dailyGoals']) => {
    setSettings(prev => {
        const newSettings = { ...prev, dailyGoals: goals };
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
    changeDailyGoals,
    reloadSettings,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};