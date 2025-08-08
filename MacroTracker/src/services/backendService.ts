// src/services/backendService.ts
import { Alert } from 'react-native';
import * as authService from './authService';
import { getClientId } from './clientIDService';
import { MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { t } from '../localization/i18n';
import { User } from '../types/user';

// Custom Error for Backend Issues, includes HTTP status
export class BackendError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'BackendError';
  }
}

// Generic, robust fetch function for interacting with the backend API
export async function fetchBackend<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
): Promise<T> {
    const url = `${authService.getApiUrl()}${endpoint}`;
    const tokenData = await authService.getAuthToken();
    const clientId = await getClientId();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-ID': clientId,
        ...(options.headers as Record<string, string> || {})
    };

    if (tokenData?.access_token) {
        headers['Authorization'] = `Bearer ${tokenData.access_token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });

        // Handle token refresh on 401 Unauthorized
        if (response.status === 401 && retry) {
            if (tokenData?.refresh_token){
                console.log('Token expired, attempting refresh...');
                const newTokens = await authService.refreshAuthToken(tokenData.refresh_token);
                if (newTokens) {
                    await authService.setAuthToken(newTokens);
                    console.log('Token refreshed, retrying original request.');
                    return await fetchBackend(endpoint, options, false); // Retry only once
                }
            }
            // If refresh fails or no refresh token, trigger logout
            authService.triggerLogout();
            throw new BackendError(t('backendService.errorAuthFailed'), 401);
        }
        
        // Handle 204 No Content response
        if (response.status === 204) {
             return null as T;
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            if (response.ok) {
                // OK status but no or invalid JSON body. Can happen.
                return null as T;
            }
            // Not OK status and also not valid JSON.
            throw new BackendError(t('backendService.errorServerUnreadable'), response.status);
        }


        // Handle other non-successful responses
        if (!response.ok) {
            const detail = data?.detail;
            let errorMessage: string;
            switch (response.status) {
                case 401: errorMessage = t('backendService.errorAuthFailed'); authService.triggerLogout(); break;
                case 403:
                    if (typeof detail === 'string' && (detail.includes('not activated') || detail.includes('not verified'))) {
                        errorMessage = t('backendService.errorEmailNotVerified');
                    } else {
                        errorMessage = t('backendService.errorPermissionDenied');
                    }
                    break;
                case 404: errorMessage = t('backendService.errorNotFound'); break;
                case 429: errorMessage = t('backendService.errorTooManyRequests'); break;
                case 402: errorMessage = t('backendService.errorInsufficientCoins'); break;
                case 500: case 503: case 504:
                    errorMessage = typeof detail === 'string' && detail ? detail : t('backendService.errorServer');
                    break;
                default:
                    errorMessage = typeof detail === 'string' && detail ? detail : t('backendService.errorGeneric');
                    break;
            }
            throw new BackendError(errorMessage, response.status);
        }
        return data as T;
    } catch (error) {
        if (error instanceof BackendError) {
            throw error;
        }

        let userFriendlyMessage: string;
        if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
            userFriendlyMessage = t('backendService.errorTimeout');
        } else {
            userFriendlyMessage = t('backendService.errorNetwork');
        }
        
        throw new BackendError(userFriendlyMessage, 0); // 0 indicates a client-side/network error
    }
}

// --- EXPORTED API FUNCTIONS ---

export const getUserStatus = (): Promise<User> => fetchBackend('/users/status');

export const getMacrosForRecipe = (foodName: string, ingredients: string): Promise<MacrosWithFoodName> => 
    fetchBackend('/ai/macros_recipe', { method: 'POST', body: JSON.stringify({ food_name: foodName, ingredients }) });

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const response = await fetchBackend<{ grams: number }>('/ai/grams_natural_language', { method: 'POST', body: JSON.stringify({ food_name: foodName, quantity_description: quantityDescription }) });
    if (typeof response?.grams !== 'number') {
        throw new BackendError(t('utils.units.invalidResponse'), 500);
    }
    return response.grams;
};

export const getMacrosForImageSingle = (base64Image: string, mimeType: string): Promise<MacrosWithFoodName> => 
    fetchBackend('/ai/macros_image_single', { method: 'POST', body: JSON.stringify({ image_base64: base64Image, mime_type: mimeType }) });

export const getMacrosForImageMultiple = (base64Image: string, mimeType: string): Promise<EstimatedFoodItem[]> => 
    fetchBackend('/ai/macros_image_multiple', { method: 'POST', body: JSON.stringify({ image_base64: base64Image, mime_type: mimeType }) });

export const getMacrosForTextMultiple = (text: string): Promise<EstimatedFoodItem[]> => 
    fetchBackend('/ai/macros_text_multiple', { method: 'POST', body: JSON.stringify({ text }) });