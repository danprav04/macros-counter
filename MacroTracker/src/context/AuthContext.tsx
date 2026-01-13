// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storageService';
import * as authService from '../services/authService';
import { getUserStatus } from '../services/backendService';
import { Settings, LanguageCode, SortOptionValue } from '../types/settings';
import { Token } from '../types/token';
import { User } from '../types/user';

export interface AuthState {
  authenticated: boolean;
  token: string | null;
}

export interface AuthContextType {
  authState: AuthState;
  isGuest: boolean;
  settings: Settings;
  user: User | null;
  isLoading: boolean;
  login: (tokenData: Token) => Promise<void>;
  logout: () => Promise<void>;
  changeTheme: (theme: 'light' | 'dark' | 'system') => void;
  changeLocale: (locale: LanguageCode) => void;
  changeDailyGoals: (goals: Settings['dailyGoals']) => void;
  changeFoodSortPreference: (sortPreference: SortOptionValue) => void;
  reloadSettings: () => Promise<void>;
  refreshUser: () => Promise<void>;
  markAiFeatureUsed: () => void;
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
    foodSortPreference: 'name',
    hasTriedAI: false,
    isAiPromoDismissed: false
  });
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    // Only refresh if we have a token
    if (authState.authenticated && authState.token) {
        try {
            const status = await getUserStatus();
            setUser(status);
        } catch (e) {
            console.warn("Could not refresh user status in AuthContext", e);
        }
    }
  }, [authState.authenticated, authState.token]);

  const reloadSettings = useCallback(async () => {
    const loadedSettings = await loadSettings();
    setSettings(loadedSettings);
  }, []);

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const tokenData = await authService.getAuthToken();
        await reloadSettings(); 

        if (tokenData?.access_token) {
          setAuthState({ authenticated: true, token: tokenData.access_token });
        } else {
          // Explicitly set to not authenticated, allowing Guest Mode logic to take over
          setAuthState({ authenticated: false, token: null });
        }
      } catch (e) {
        console.error("Failed to load auth data", e);
        setAuthState({ authenticated: false, token: null });
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, [reloadSettings]);

  useEffect(() => {
    if (authState.authenticated) {
      refreshUser();
    } else {
        setUser(null);
    }
  }, [authState.authenticated, refreshUser]);

  const login = async (tokenData: Token) => {
    try {
      await authService.setAuthToken(tokenData);
      setAuthState({ authenticated: true, token: tokenData.access_token });
    } catch (error) {
      console.error("Login failed: Could not save the token.", error);
      setAuthState({ authenticated: false, token: null });
      setUser(null);
    }
  };

  const logout = async () => {
    if (authState.authenticated) {
        await authService.logoutUser();
    }
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
  
  const changeFoodSortPreference = useCallback((sortPreference: SortOptionValue) => {
    setSettings(prev => {
        const newSettings = { ...prev, foodSortPreference: sortPreference };
        saveSettings(newSettings);
        return newSettings;
    });
  }, []);

  const markAiFeatureUsed = useCallback(() => {
      setSettings(prev => {
          if (prev.hasTriedAI) return prev;
          const newSettings = { ...prev, hasTriedAI: true };
          saveSettings(newSettings);
          return newSettings;
      });
  }, []);

  // Derived state: Guest if not loading and not authenticated
  const isGuest = !isLoading && !authState.authenticated;

  const value: AuthContextType = {
    authState,
    isGuest,
    settings,
    user,
    isLoading,
    login,
    logout,
    changeTheme,
    changeLocale,
    changeDailyGoals,
    changeFoodSortPreference,
    reloadSettings,
    refreshUser,
    markAiFeatureUsed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};