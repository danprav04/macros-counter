// src/services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Token } from '../types/token';
import { t } from '../localization/i18n';

// --- Centralized API URL Configuration ---
const getBackendUrl = (): string => {
    // This variable is set by EAS build or in .env for local development
    const url = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (!url) {
        console.warn(
            "Backend URL is not configured. Falling back to default development URL. Create a .env file with EXPO_PUBLIC_BACKEND_URL=http://your-ip:8000 for local development."
        );
        return 'http://192.168.1.15:8000'; // Default dev URL
    }
    return url;
};

export const getApiUrl = (): string => {
    const baseUrl = getBackendUrl();
    return baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/v1`;
};

const API_URL = getApiUrl();

// --- Auth Event Emitter for 401 Handling ---
type LogoutListener = (() => void) | null;
let onLogout: LogoutListener = null;

export const setLogoutListener = (listener: LogoutListener) => {
    onLogout = listener;
};

export const triggerLogout = () => {
    console.log("Global logout triggered.");
    removeAuthToken();
    if (onLogout) {
        onLogout();
    } else {
        console.warn('Logout triggered, but no UI listener was set.');
    }
};

// --- Token Management ---
const AUTH_TOKEN_KEY = '@MacroTracker:authToken';

export const getAuthToken = async (): Promise<Token | null> => {
    const tokenJson = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return tokenJson ? JSON.parse(tokenJson) : null;
};

export const setAuthToken = async (token: Token): Promise<void> => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
};

export const removeAuthToken = async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
};

// --- API Calls ---
async function fetchAuthApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}/auth${endpoint}`;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 204) { // Handle No Content for logout
             return {} as T;
        }

        const responseBody = await response.json();

        if (!response.ok) {
            const errorMessage = responseBody.detail || 'An unknown error occurred.';
            const detailMessage = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
            throw new Error(detailMessage);
        }
        return responseBody as T;
    } catch (error: any) {
        Alert.alert('Authentication Error', error.message || 'Could not connect to the server.');
        throw error;
    }
}

export const registerUser = async (email: string, password: string): Promise<{message: string}> => {
    return fetchAuthApi<{message: string}>('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
};

export const loginUser = async (email: string, password: string): Promise<Token> => {
    const details = { 'username': email, 'password': password };
    const formBody = Object.entries(details)
        .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value))
        .join('&');

    const url = `${API_URL}/auth/login`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: formBody,
        });
        
        const responseBody = await response.json();

        if (!response.ok) {
            throw new Error(responseBody.detail || 'Login failed');
        }
        return responseBody;
    } catch (error: any) {
        Alert.alert('Login Error', error.message || 'Could not connect to the server.');
        throw error;
    }
};

export const refreshAuthToken = async (refreshToken: string): Promise<Token | null> => {
    try {
        // Assuming the backend was updated to return the new refresh token in the body as well
        const newTokens = await fetchAuthApi<Token>('/refresh-token', {
             method: 'POST',
             body: JSON.stringify({ refresh_token: refreshToken })
        });
        return newTokens;
    } catch (error) {
        console.error("Token refresh failed:", error);
        return null;
    }
};

export const logoutUser = async (): Promise<void> => {
    try {
        const tokenData = await getAuthToken();
        if (tokenData?.access_token) {
            await fetchAuthApi('/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            });
        }
    } catch (error) {
        console.warn("Logout API call failed, but logging out locally anyway.", error);
    } finally {
        await removeAuthToken();
    }
}

export const requestPasswordReset = async (email: string): Promise<{message: string}> => {
    return fetchAuthApi<{message: string}>('/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};