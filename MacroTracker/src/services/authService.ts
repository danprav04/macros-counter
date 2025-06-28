// src/services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

// --- Centralized API URL Configuration ---
const getBackendUrl = (): string => {
    // EAS Build's process.env takes precedence
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL_PRODUCTION;
    if (envUrl) {
        return envUrl;
    }
    // Fallback for older expo-constants approach or local dev without .env
    const configUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION;
    if (configUrl) {
        return configUrl;
    }
    // Final fallback to a default development URL
    console.warn(
        "Production backend URL not found in process.env or app.json. Falling back to default development URL."
    );
    return 'http://192.168.1.15:8000'; // Default dev URL
};

export const getApiUrl = (): string => {
    const baseUrl = getBackendUrl();
    return baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/v1`;
};

const API_URL = getApiUrl();

// --- Auth Event Emitter for 401 Handling ---
type LogoutListener = () => void;
let onLogout: LogoutListener | null = null;

export const setLogoutListener = (listener: LogoutListener) => {
    onLogout = listener;
};

export const triggerLogout = () => {
    if (onLogout) {
        onLogout();
    } else {
        console.warn('Logout triggered, but no listener was set. A full app reload might be required.');
        // Fallback behavior if the listener isn't set for some reason
        removeAuthToken();
    }
};


// --- Token Management ---
const AUTH_TOKEN_KEY = '@MacroTracker:authToken';

export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
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

        // For 202 Accepted, the body might be empty or contain a message.
        // We handle it as a success case.
        if (response.status === 202) {
            return (await response.json()) as T;
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

export const registerUser = async (email: string, password: string): Promise<any> => {
    return fetchAuthApi('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
};

export const loginUser = async (email: string, password: string): Promise<{access_token: string}> => {
    const details = { 'username': email, 'password': password };
    
    // Corrected: Use Object.entries for a type-safe way to build form data
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

export const requestPasswordReset = async (email: string): Promise<{message: string}> => {
    return fetchAuthApi<{message: string}>('/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};