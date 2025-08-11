// src/services/authService.ts
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { Token } from '../types/token';
import { t } from '../localization/i18n';
import { getToken, saveToken, deleteToken } from './tokenStorage';

// --- Centralized API URL Configuration ---
const getBackendUrl = (): string => {
    const env = Constants.expoConfig?.extra?.env;

    if (__DEV__) {
        if (env?.BACKEND_URL_DEVELOPMENT) {
            return env.BACKEND_URL_DEVELOPMENT;
        }
        console.warn(
            "BACKEND_URL_DEVELOPMENT not found in app.json. Falling back to a default."
        );
        return 'http://127.0.0.1:8000';
    } else {
        if (env?.BACKEND_URL_PRODUCTION) {
            return env.BACKEND_URL_PRODUCTION;
        }
        console.error("FATAL: BACKEND_URL_PRODUCTION is not defined in app.json extra.env.");
        return 'https://api.example.com/not-configured';
    }
};

export const getApiUrl = (): string => {
    const baseUrl = getBackendUrl();
    return baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/v1`;
};

// --- Auth Event Emitter for 401 Handling ---
type LogoutListener = (() => void) | null;
let onLogout: LogoutListener = null;

export const setLogoutListener = (listener: LogoutListener) => {
    onLogout = listener;
};

export const triggerLogout = () => {
    console.log("Global logout triggered.");
    deleteToken(); // Use the new abstracted function
    if (onLogout) {
        onLogout();
    } else {
        console.warn('Logout triggered, but no UI listener was set.');
    }
};

// --- Token Management using the abstraction layer ---
export {
  getToken as getAuthToken,
  saveToken as setAuthToken,
  deleteToken as removeAuthToken,
};

// --- API Calls ---
async function fetchAuthApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${getApiUrl()}/auth${endpoint}`;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 204) {
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

    const url = `${getApiUrl()}/auth/login`;

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
        const tokenData = await getToken();
        if (tokenData?.access_token) {
            await fetchAuthApi('/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            });
        }
    } catch (error) {
        console.warn("Logout API call failed, but logging out locally anyway.", error);
    } finally {
        await deleteToken();
    }
}

export const requestPasswordReset = async (email: string): Promise<{message: string}> => {
    return fetchAuthApi<{message: string}>('/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};