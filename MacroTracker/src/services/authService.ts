import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

const AUTH_TOKEN_KEY = '@MacroTracker:authToken';

const getBackendUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL_PRODUCTION;
    const configUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION;
    const url = envUrl || configUrl || 'http://192.168.1.15:8000';
    return url.endsWith('/api/v1') ? url : `${url.replace(/\/$/, '')}/api/v1`;
};

const API_URL = getBackendUrl();

// --- Token Management ---
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