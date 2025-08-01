// src/services/backendService.ts
import { Alert } from 'react-native';
import * as authService from './authService';
import { getClientId } from './clientIDService';
import { MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { t } from '../localization/i18n';

// Custom Error for Backend Issues, includes HTTP status
export class BackendError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'BackendError';
  }
}

// Generic, robust fetch function for interacting with the backend API
async function fetchBackend<T>(
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
        if (response.status === 401 && retry && tokenData?.refresh_token) {
            console.log('Token expired, attempting refresh...');
            const newTokens = await authService.refreshAuthToken(tokenData.refresh_token);
            if (newTokens) {
                await authService.setAuthToken(newTokens);
                console.log('Token refreshed, retrying original request.');
                return await fetchBackend(endpoint, options, false); // Retry only once
            } else {
                authService.triggerLogout();
                throw new BackendError(t('backendService.errorAuthFailed'), 401);
            }
        }
        
        // Handle 204 No Content response
        if (response.status === 204) {
             return null as T;
        }

        const responseBody = await response.text();
        let data;
        try {
            data = JSON.parse(responseBody);
        } catch (e) {
            if (!response.ok) {
                 throw new BackendError(t('backendService.errorRequestFailedParse', { status: response.status }), response.status);
            }
            return responseBody as T;
        }

        // Handle other non-successful responses
        if (!response.ok) {
            const detail = data?.detail;
            let errorMessage: string;
            switch (response.status) {
                case 401: errorMessage = t('backendService.errorAuthFailed'); authService.triggerLogout(); break;
                case 403: errorMessage = t('backendService.errorPermissionDenied'); break;
                case 404: errorMessage = t('backendService.errorNotFound'); break;
                case 429: errorMessage = t('backendService.errorTooManyRequests'); break;
                case 402: errorMessage = t('backendService.errorInsufficientCoins'); break;
                default:
                    if (typeof detail === 'string') errorMessage = detail;
                    else if (detail) errorMessage = t('backendService.errorRequestFailedDetailFormat', { status: response.status });
                    else errorMessage = t('backendService.errorRequestFailedWithServerMsg', { status: response.status });
                    break;
            }
            throw new BackendError(errorMessage, response.status);
        }
        return data as T;
    } catch (error) {
        if (error instanceof BackendError) throw error;
        
        let networkErrorMessage = t('backendService.errorNetwork');
        if (error instanceof Error) {
            if (error.message.toLowerCase().includes('timeout')) networkErrorMessage += t('backendService.errorNetworkTimeout');
            else if (error.message.toLowerCase().includes('network request failed')) networkErrorMessage += t('backendService.errorNetworkConnection');
            else networkErrorMessage += t('backendService.errorNetworkDetails', { error: error.message });
        } else {
             networkErrorMessage += t('backendService.errorNetworkUnknown');
        }
        throw new BackendError(networkErrorMessage, 0);
    }
}

// --- EXPORTED API FUNCTIONS ---

export const getUserStatus = (): Promise<{ coins: number }> => fetchBackend('/users/status');

export const addCoinsToUser = (amount: number): Promise<{ coins: number }> => {
    if (amount <= 0) {
        return Promise.reject(new BackendError(t('backendService.errorAddCoinsPositive'), 400));
    }
    return fetchBackend('/users/add-coins', { method: 'POST', body: JSON.stringify({ amount }) });
};

export const getMacrosForRecipe = (foodName: string, ingredients: string): Promise<MacrosWithFoodName> => 
    fetchBackend('/macros/recipe', { method: 'POST', body: JSON.stringify({ food_name: foodName, ingredients }) });

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const response = await fetchBackend<{ grams: number }>('/macros/estimate-grams', { method: 'POST', body: JSON.stringify({ food_name: foodName, quantity_description: quantityDescription }) });
    if (typeof response?.grams !== 'number') {
        throw new BackendError(t('backendService.errorEstimateGramsUnexpectedResponse'), 500);
    }
    return response.grams;
};

export const getMacrosForImageSingle = (base64Image: string, mimeType: string): Promise<MacrosWithFoodName> => 
    fetchBackend('/macros/image-single', { method: 'POST', body: JSON.stringify({ base64_image: base64Image, mime_type: mimeType }) });

export const getMacrosForImageMultiple = (base64Image: string, mimeType: string): Promise<EstimatedFoodItem[]> => 
    fetchBackend('/macros/image-multiple', { method: 'POST', body: JSON.stringify({ base64_image: base64Image, mime_type: mimeType }) });

export const getMacrosForTextMultiple = (text: string): Promise<EstimatedFoodItem[]> => 
    fetchBackend('/macros/text-multiple', { method: 'POST', body: JSON.stringify({ text }) });