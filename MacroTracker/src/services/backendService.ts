// src/services/backendService.ts
import Constants from 'expo-constants';
import { getClientId } from './clientIDService';
// Correctly import types from their new location
import { EstimatedFoodItem, Macros, MacrosWithFoodName } from '../types/macros';

// --- Configuration ---
// Use environment variable from Expo config (extra.env.BACKEND_URL) or fallback
// Ensure you set this in app.json or app.config.js/ts
const getBackendUrl = (): string => {
    // Access environment variables defined in app.json extra field
    const backendUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL;
    if (!backendUrl) {
        console.warn("BACKEND_URL not found in app.json extra.env, using default development URL.");
        // Fallback to a default development URL if needed
        // IMPORTANT: Replace this with your actual development backend IP/hostname
        return 'http://192.168.1.15:8000/api/v1';
    }
    console.log("Using Backend URL:", backendUrl);
    return `${backendUrl}/api/v1`;
};

const BASE_URL = getBackendUrl();


// --- Interfaces ---
interface GramsResponse {
    grams: number;
}

interface IconResponse {
    icon_url: string | null;
}

interface BackendErrorDetail {
    detail?: string | any;
}

// --- Custom Error Class ---
export class BackendError extends Error {
    status: number;
    detail?: string | any;

    constructor(message: string, status: number, detail?: string | any) {
        super(message);
        this.name = 'BackendError';
        this.status = status;
        this.detail = detail;
    }
}

// --- API Call Helper ---
async function fetchBackend<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Calling Backend: ${options.method || 'GET'} ${url}`);

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // Add Client ID header to every request automatically
    const clientId = await getClientId();
    const authHeaders = {
        'X-Client-ID': clientId, // Assuming backend expects this header
    };


    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...authHeaders, // Add client ID header
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Attempt to parse JSON regardless of status code for error details
        let responseBody: any;
        try {
            responseBody = await response.json();
        } catch (e) {
            // If JSON parsing fails (e.g., empty response, non-JSON error page)
            console.error(`Backend response for ${url} was not valid JSON. Status: ${response.status}`);
            // Throw a specific error if response wasn't OK, otherwise might be empty 204 etc.
            if (!response.ok) {
                throw new BackendError(`Backend request failed with status ${response.status}. Response was not valid JSON.`, response.status, await response.text()); // Include raw text if possible
            }
            // If response was OK but no JSON body, return null or handle as appropriate for T
            return null as T; // Adjust based on expected return types
        }


        if (!response.ok) {
            console.error(`Backend Error (${response.status}) on ${url}:`, responseBody);
            const detail = (responseBody as BackendErrorDetail)?.detail || 'Unknown backend error';
            let message = `Backend request failed with status ${response.status}`;
            if (response.status === 402) {
                message = 'Insufficient coins.';
            } else if (typeof detail === 'string') {
                message = detail;
            } else if (detail && typeof detail === 'object') {
                // Try to extract a meaningful message from object detail
                message = JSON.stringify(detail);
            }
            throw new BackendError(message, response.status, detail);
        }

        console.log(`Backend Success (${response.status}) on ${url}`);
        return responseBody as T;

    } catch (error) {
        if (error instanceof BackendError) {
            throw error; // Re-throw known backend errors
        }
        // Handle network errors (e.g., server unreachable)
        console.error(`Network or parsing error calling ${url}:`, error);
        let errorMessage = `Failed to communicate with the backend.`;
        if (error instanceof TypeError && error.message.includes('Network request failed')) {
             errorMessage += ' Please check your network connection and ensure the backend server is running.';
        } else if (error instanceof Error) {
            errorMessage += ` ${error.message}`;
        } else {
             errorMessage += ' An unknown network error occurred.';
        }
        // Throw a generic error for network issues or unexpected problems
        throw new Error(errorMessage);
    }
}

// --- Service Functions ---

export const getUserStatus = async (): Promise<{ client_id: string; coins: number }> => {
    // Client ID is now added automatically in fetchBackend helper
    const clientId = await getClientId(); // Still needed for the URL path
    return fetchBackend<{ client_id: string; coins: number }>(`/users/status/${clientId}`);
};

export const getMacrosForRecipe = async (foodName: string, ingredients: string): Promise<Macros> => {
    // Client ID added automatically by fetchBackend
    const body = { /* client_id removed */ food_name: foodName, ingredients };
    return fetchBackend<Macros>('/ai/macros_recipe', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const getMacrosForImageSingle = async (image_base64: string, mime_type: string): Promise<MacrosWithFoodName> => {
    // Client ID added automatically by fetchBackend
    const body = { /* client_id removed */ image_base64, mime_type };
    return fetchBackend<MacrosWithFoodName>('/ai/macros_image_single', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const getMacrosForImageMultiple = async (image_base64: string, mime_type: string): Promise<EstimatedFoodItem[]> => {
    // Client ID added automatically by fetchBackend
    const body = { /* client_id removed */ image_base64, mime_type };
    return fetchBackend<EstimatedFoodItem[]>('/ai/macros_image_multiple', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    // Client ID added automatically by fetchBackend
    const body = { /* client_id removed */ food_name: foodName, quantity_description: quantityDescription };
    const response = await fetchBackend<GramsResponse>('/ai/grams_natural_language', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    // Handle potential null response if fetchBackend returns null for non-JSON OK response
    if (!response) {
        throw new Error("Received unexpected null response while estimating grams.");
    }
    return response.grams;
};

export const getFoodIcon = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
    const encodedFoodName = encodeURIComponent(foodName);
    const encodedLocale = encodeURIComponent(locale);
    // Client ID added automatically by fetchBackend
    try {
        const response = await fetchBackend<IconResponse>(`/icons/food?food_name=${encodedFoodName}&locale=${encodedLocale}`);
         // Handle potential null response
         if (!response) {
            console.warn(`Received null response when fetching icon for ${foodName}. Treating as no icon found.`);
            return null;
         }
        return response.icon_url;
    } catch (error) {
         console.error(`Failed to get icon for ${foodName} via backend service:`, error);
         // Don't re-throw here, iconUtils handles the null return
         return null;
    }
};