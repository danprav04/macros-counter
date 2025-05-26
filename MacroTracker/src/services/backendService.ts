// src/services/backendService.ts
// ---------- src/services/backendService.ts ----------
import Constants from 'expo-constants';
import { getClientId } from './clientIDService';
import { EstimatedFoodItem, Macros, MacrosWithFoodName } from '../types/macros';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';
import i18n, { t } from '../localization/i18n'; // Import t and i18n

const getBackendUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL_PRODUCTION;
    if (envUrl) {
        console.log("Using Backend URL from EXPO_PUBLIC_BACKEND_URL:", envUrl);
        return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
    }
    const configUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION;
    console.log(envUrl, configUrl);
    
    if (configUrl) {
        console.warn("Using Backend URL from app.json extra.env. Consider using build-time environment variables (EXPO_PUBLIC_*) for production.");
        return configUrl.endsWith('/api/v1') ? configUrl : `${configUrl.replace(/\/$/, '')}/api/v1`;
    }
    console.error("BACKEND_URL not found in environment variables or app.json extra.env. Using default DEVELOPMENT URL. THIS IS NOT FOR PRODUCTION.");
    const DEV_URL = 'http://192.168.1.15:8000';
    return `${DEV_URL}/api/v1`;
};

const BASE_URL = getBackendUrl();
console.log(`Backend Service Initialized. Base URL: ${BASE_URL}`);

interface GramsResponse { grams: number; }
interface IconResponse { icon_url: string | null | undefined; }
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
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    const method = options.method || 'GET';
    let response: Response | null = null; let requestId: string | null = null;

    console.log(`[API Request] ${method} ${url} - Starting (Auth: ${needsAuth}, Locale: ${i18n.locale})`);

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'X-Platform': Platform.OS, 'Accept-Language': i18n.locale,
    };
    let authHeaders: HeadersInit = {};
    if (needsAuth) {
        const clientId = await getClientId();
        if (!uuid.validate(clientId)) {
             console.error(`[API Request] Invalid Client ID format detected: ${clientId}. Aborting request.`);
             throw new BackendError(t('backendService.errorInvalidClientId'), 400, "Invalid client ID format.");
        }
        authHeaders = { 'X-Client-ID': clientId };
        console.log(`[API Request] Adding X-Client-ID header.`);
    }
    const config: RequestInit = { ...options, headers: { ...defaultHeaders, ...authHeaders, ...options.headers, } };

     if (config.body && typeof config.body === 'string') {
          try {
              const bodyObj = JSON.parse(config.body);
              const bodyKeys = Object.keys(bodyObj);
              const bodyPreview = bodyKeys.length > 0 ? `{ keys: [${bodyKeys.join(', ')}] }` : '{}';
              console.log(`[API Request] ${method} ${url} - Body Preview: ${bodyPreview}`);
          } catch {
              console.log(`[API Request] ${method} ${url} - Body: (non-JSON or failed parse)`);
          }
     }

    try {
        response = await fetch(url, config);
        requestId = response.headers.get("X-Request-ID");
        const status = response.status; const contentType = response.headers.get("content-type");

        console.log(`[API Response] ${method} ${url} - Status: ${status}, Content-Type: ${contentType}, RequestID: ${requestId || 'N/A'}`);

        if (status === 204) {
             console.log(`[API Response] ${method} ${url} - Success (204 No Content)`);
             return null as T;
        }

        let responseBody: any; let isJson = false;
        try {
            if (contentType && contentType.includes("application/json")) {
                responseBody = await response.json();
                isJson = true;
            } else {
                responseBody = await response.text();
                console.log(`[API Response] ${method} ${url} - Received Text: ${responseBody.substring(0, 200)}...`);
            }
        } catch (parseError) {
            console.error(`[API Error] ${method} ${url} - Failed to parse response body (Status: ${status}):`, parseError);
            const rawText = await response.text().catch(() => '(Could not get raw text)');
            if (!response.ok) {
                throw new BackendError(t('backendService.errorRequestFailedParse', {status}), status, rawText, requestId);
            } else {
                console.warn(`[API Warning] ${method} ${url} - Status ${status} OK, but failed to parse response body.`);
                 return null as T;
            }
        }

        if (!response.ok) {
            let errorMessage = t('backendService.errorRequestFailedParse', {status}); // Default translated message
            let errorDetail: string | BackendErrorDetail[] | undefined = undefined;

            if (isJson && responseBody) {
                 const errorData = responseBody as BackendErrorResponse;
                 if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail; // Use backend's specific string detail if available
                    errorDetail = errorMessage;
                 } else if (Array.isArray(errorData.detail)) {
                     errorMessage = t('backendService.errorRequestFailedDetailFormat', {status}); // Generic for validation array
                     errorDetail = errorData.detail;
                     console.warn(`[API Validation Error] ${method} ${url} - Details:`, JSON.stringify(errorDetail));
                 } else {
                      errorMessage = t('backendService.errorRequestFailedDetailFormat', {status});
                      errorDetail = JSON.stringify(responseBody);
                 }
            } else if (!isJson) {
                 errorMessage = t('backendService.errorRequestFailedWithServerMsg', {status, response: responseBody.substring(0,100)});
                 errorDetail = responseBody;
            }

            if (status === 401 && needsAuth) errorMessage = t('backendService.errorAuthFailed');
            if (status === 403) errorMessage = t('backendService.errorPermissionDenied');
            if (status === 404) errorMessage = t('backendService.errorNotFound');
            if (status === 429) errorMessage = t('backendService.errorTooManyRequests');
            if (status === 402) errorMessage = t('backendService.errorInsufficientCoins');

            console.error(`[API Error] ${method} ${url} - Status: ${status}, Message: "${errorMessage}", Detail:`, errorDetail);
            throw new BackendError(errorMessage, status, errorDetail, requestId);
        }

        console.log(`[API Response] ${method} ${url} - Success (Status: ${status})`);
        return responseBody as T;

    } catch (error) {
        const logRequestId = requestId ? ` (RequestID: ${requestId})` : '';
        if (error instanceof BackendError) throw error;

        console.error(`[API Network Error] ${method} ${url}${logRequestId} - Error:`, error);
        let networkErrorMessage = t('backendService.errorNetwork');
         if (error instanceof Error) {
             if (error.name === 'AbortError' || error.message.includes('timed out')) networkErrorMessage = t('backendService.errorNetworkTimeout');
             else if (error.message.includes('Network request failed')) networkErrorMessage += t('backendService.errorNetworkConnection');
             else networkErrorMessage += t('backendService.errorNetworkDetails', {error: error.message});
         } else networkErrorMessage += t('backendService.errorNetworkUnknown');
        throw new BackendError(networkErrorMessage, 0, networkErrorMessage, requestId);
    }
}

export const getUserStatus = async (): Promise<UserStatus> => {
    const clientId = await getClientId();
    return fetchBackend<UserStatus>(`/users/status/${clientId}`, {}, true);
};

export const getMacrosForRecipe = async (foodName: string, ingredients: string): Promise<Macros> => {
    const body = { food_name: foodName, ingredients };
    return fetchBackend<Macros>('/ai/macros_recipe', { method: 'POST', body: JSON.stringify(body), }, true);
};

export const getMacrosForImageSingle = async (image_base64: string, mime_type: string): Promise<MacrosWithFoodName> => {
    const body = { image_base64, mime_type };
    return fetchBackend<MacrosWithFoodName>('/ai/macros_image_single', { method: 'POST', body: JSON.stringify(body), }, true);
};

export const getMacrosForImageMultiple = async (image_base64: string, mime_type: string): Promise<EstimatedFoodItem[]> => {
    const body = { image_base64, mime_type };
    return fetchBackend<EstimatedFoodItem[]>('/ai/macros_image_multiple', { method: 'POST', body: JSON.stringify(body), }, true);
};

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const body = { food_name: foodName, quantity_description: quantityDescription };
    const response = await fetchBackend<GramsResponse>('/ai/grams_natural_language', { method: 'POST', body: JSON.stringify(body), }, true);
    if (response === null || typeof response.grams !== 'number') {
        throw new BackendError(t('backendService.errorEstimateGramsUnexpectedResponse'), 500, "Invalid response format");
    }
    return response.grams;
};

export const getFoodIcon = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
    const encodedFoodName = encodeURIComponent(foodName);
    const encodedLocale = encodeURIComponent(locale); // Use the passed locale
    try {
        const response = await fetchBackend<IconResponse>( `/icons/food?food_name=${encodedFoodName}&locale=${encodedLocale}`, {}, false );
        if (response === null) return null;
        return response.icon_url ?? null; // Ensure null if undefined
    } catch (error) {
        if (error instanceof BackendError && error.status === 404) return null;
        console.error(`Failed to get icon for ${foodName} via backend service:`, error);
         return null;
    }
};

export const addCoinsToUser = async (amount: number): Promise<UserStatus> => {
    const clientId = await getClientId();
    const body = { amount };
    if (amount <= 0) throw new BackendError(t('backendService.errorAddCoinsPositive'), 400, "Amount must be positive.");
    return fetchBackend<UserStatus>(`/users/add_coins/${clientId}`, { method: 'POST', body: JSON.stringify(body), }, true);
};