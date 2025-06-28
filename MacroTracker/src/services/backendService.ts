// src/services/backendService.ts
import { getApiUrl, getAuthToken, triggerLogout } from './authService';
import { EstimatedFoodItem, Macros, MacrosWithFoodName } from '../types/macros';
import { Platform } from 'react-native';
import i18n, { t } from '../localization/i18n';

const BASE_URL = getApiUrl();
console.log(`Backend Service Initialized. Base URL: ${BASE_URL}`);

interface GramsResponse { grams: number; }
export interface UserStatus { client_id: string; coins: number; }
interface BackendErrorDetail { loc?: (string | number)[]; msg?: string; type?: string; }
interface BackendErrorResponse { detail?: string | BackendErrorDetail[]; }

export class BackendError extends Error {
    status: number; detail?: string | BackendErrorDetail[]; requestId?: string | null;
    constructor(message: string, status: number, detail?: string | BackendErrorDetail[], requestId?: string | null) {
        super(message); this.name = 'BackendError'; this.status = status; this.detail = detail; this.requestId = requestId;
    }
}

async function fetchBackend<T>( endpoint: string, options: RequestInit = {}, needsAuth: boolean = true ): Promise<T> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    let response: Response | null = null;
    let requestId: string | null = null;
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Platform': Platform.OS,
            'Accept-Language': i18n.locale,
            ...(options.headers as Record<string, string> || {})
        };

        if (needsAuth) {
            const token = await getAuthToken();
            if (!token) {
                // If a screen needs auth and there's no token, this will prevent the call.
                // The user should be redirected to login by the navigation logic.
                throw new BackendError(t('backendService.errorAuthFailed'), 401, "Authentication token is missing.");
            }
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        response = await fetch(url, { ...options, headers });
        requestId = response.headers.get("X-Request-ID");

        if (response.status === 204) return null as T;

        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");
        const responseBody = isJson ? await response.json() : await response.text();

        if (!response.ok) {
            let errorMessage = t('backendService.errorRequestFailedWithServerMsg', { status: response.status });
            if (isJson && responseBody?.detail) {
                errorMessage = typeof responseBody.detail === 'string' ? responseBody.detail : JSON.stringify(responseBody.detail);
            } else if (!isJson && responseBody) {
                errorMessage = t('backendService.errorRequestFailedWithServerMsg', { status: response.status });
            }
            
            if (response.status === 401) {
                errorMessage = t('backendService.errorAuthFailed');
                // Trigger global logout handler
                triggerLogout();
            }
            if (response.status === 402) errorMessage = t('backendService.errorInsufficientCoins');
            if (response.status === 429) errorMessage = t('backendService.errorTooManyRequests');

            throw new BackendError(errorMessage, response.status, responseBody?.detail, requestId);
        }
        return responseBody as T;

    } catch (error) {
        if (error instanceof BackendError) throw error;
        
        let networkErrorMessage: string;
        if (error instanceof Error && error.name === 'AbortError') {
            networkErrorMessage = t('backendService.errorNetworkTimeout');
        } else if (error instanceof Error && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch'))) {
            networkErrorMessage = t('backendService.errorNetwork') + t('backendService.errorNetworkConnection');
        } else if (error instanceof Error) {
            networkErrorMessage = t('backendService.errorNetwork') + t('backendService.errorNetworkDetails', { error: error.message });
        } else {
            networkErrorMessage = t('backendService.errorNetwork') + t('backendService.errorNetworkUnknown');
        }
        
        throw new BackendError(networkErrorMessage, 0, networkErrorMessage, requestId);
    }
}

export const getUserStatus = async (): Promise<UserStatus> => fetchBackend<UserStatus>('/users/status');
export const getMacrosForRecipe = async (foodName: string, ingredients: string): Promise<MacrosWithFoodName> => fetchBackend<MacrosWithFoodName>('/ai/macros_recipe', { method: 'POST', body: JSON.stringify({ food_name: foodName, ingredients }) });
export const getMacrosForImageSingle = async (image_base64: string, mime_type: string): Promise<MacrosWithFoodName> => fetchBackend<MacrosWithFoodName>('/ai/macros_image_single', { method: 'POST', body: JSON.stringify({ image_base64, mime_type }) });
export const getMacrosForImageMultiple = async (image_base64: string, mime_type: string): Promise<EstimatedFoodItem[]> => fetchBackend<EstimatedFoodItem[]>('/ai/macros_image_multiple', { method: 'POST', body: JSON.stringify({ image_base64, mime_type }) });
export const getMacrosForTextMultiple = async (text: string): Promise<EstimatedFoodItem[]> => fetchBackend<EstimatedFoodItem[]>('/ai/macros_text_multiple', { method: 'POST', body: JSON.stringify({ text }) });
export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const response = await fetchBackend<GramsResponse>('/ai/grams_natural_language', { method: 'POST', body: JSON.stringify({ food_name: foodName, quantity_description: quantityDescription }) });
    if (response === null || typeof response.grams !== 'number') throw new BackendError(t('backendService.errorEstimateGramsUnexpectedResponse'), 500, "Invalid response format");
    return response.grams;
};
export const addCoinsToUser = async (amount: number): Promise<UserStatus> => {
    if (amount <= 0) throw new BackendError(t('backendService.errorAddCoinsPositive'), 400, "Amount must be positive.");
    return fetchBackend<UserStatus>('/users/add_coins', { method: 'POST', body: JSON.stringify({ amount }) });
};