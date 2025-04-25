// src/services/backendService.ts
// ---------- backendService.ts ----------
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
        // Make sure the path includes the /api/v1 prefix if your backend expects it
        return 'http://192.168.1.15:8000/api/v1';
    }
    console.log("Using Backend URL:", backendUrl);
    // Ensure the URL ends with /api/v1 if the backend is structured that way
    // Check if backendUrl already includes the prefix
    const apiPrefix = "/api/v1";
    if (backendUrl.endsWith(apiPrefix)) {
        return backendUrl;
    } else {
        // Append the prefix, removing trailing slashes if they exist
        return `${backendUrl.replace(/\/$/, '')}${apiPrefix}`;
    }
};

const BASE_URL = getBackendUrl();


// --- Interfaces ---
interface GramsResponse {
    grams: number;
}

interface IconResponse {
    icon_url: string | null;
}

// Interface representing the user status response from the backend
export interface UserStatus {
    client_id: string;
    coins: number;
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
    // Ensure endpoint starts with a '/' for clean joining
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    console.log(`Calling Backend: ${options.method || 'GET'} ${url}`);

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // Add Client ID header to every request automatically
    const clientId = await getClientId();
    const authHeaders: HeadersInit = {
        'X-Client-ID': clientId, // Backend expects this header
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
        const contentType = response.headers.get("content-type");
        try {
            if (contentType && contentType.indexOf("application/json") !== -1) {
                responseBody = await response.json();
            } else {
                 // Handle non-JSON responses (e.g., plain text errors from proxies/servers)
                 responseBody = await response.text();
                 // If response was not OK, throw using the text body
                 if (!response.ok) {
                    console.error(`Backend Error (${response.status}) on ${url}: Received non-JSON response: ${responseBody}`);
                    throw new BackendError(`Backend request failed with status ${response.status}. Non-JSON response: ${responseBody}`, response.status, responseBody);
                 }
                 // If response was OK but non-JSON, it might be unexpected. Log or handle.
                 console.warn(`Backend Success (${response.status}) on ${url}: Received non-JSON response: ${responseBody}`);
                 // Depending on expected T, you might return null or throw.
                 // If T is expected to be always JSON, this should be an error.
                 // If T could be string, return responseBody. For now, assume JSON is expected.
                  if (typeof responseBody === 'string' && responseBody === '') {
                     // Handle empty successful responses (e.g., 204 No Content)
                     return null as T;
                 }
                 throw new BackendError(`Received unexpected non-JSON response from backend. Status: ${response.status}`, response.status, responseBody);
            }
        } catch (e) {
            // JSON parsing failed specifically
            console.error(`Backend response for ${url} was not valid JSON. Status: ${response.status}`, e);
            // Throw a specific error if response wasn't OK, otherwise might be empty 204 etc.
            if (!response.ok) {
                 const errorText = await response.text(); // Try to get raw text
                throw new BackendError(`Backend request failed with status ${response.status}. Response was not valid JSON.`, response.status, errorText);
            }
            // If response was OK but no JSON body (or failed parsing), return null or handle as appropriate for T
            return null as T; // Adjust based on expected return types
        }


        if (!response.ok) {
            console.error(`Backend Error (${response.status}) on ${url}:`, responseBody);
            const detail = (responseBody as BackendErrorDetail)?.detail || 'Unknown backend error';
            let message = `Backend request failed with status ${response.status}`;
            if (response.status === 402) {
                message = 'Insufficient coins.';
            } else if (typeof detail === 'string') {
                message = detail; // Use detail message from backend if available and string
            } else if (detail && typeof detail === 'object') {
                // Try to extract a meaningful message from object detail, e.g., validation errors
                 try {
                     message = JSON.stringify(detail); // Show the structure if it's an object
                 } catch { /* ignore stringify error */ }
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
        console.error(`Network or other error calling ${url}:`, error);
        let errorMessage = `Failed to communicate with the backend.`;
         // Check for common fetch error messages
         if (error instanceof Error) {
             if (error.message.includes('Network request failed')) {
                 errorMessage += ' Please check your network connection and ensure the backend server is running.';
             } else if (error.message.includes('fetch')) { // Generic fetch error
                 errorMessage += ' A network error occurred during the request.';
             } else {
                 errorMessage += ` Details: ${error.message}`;
             }
         } else {
             errorMessage += ' An unknown network error occurred.';
         }
        // Throw a generic error for network issues or unexpected problems
        // Use status 0 or a custom code to indicate client-side network error
        throw new BackendError(errorMessage, 0, errorMessage);
    }
}

// --- Service Functions ---

export const getUserStatus = async (): Promise<UserStatus> => {
    const clientId = await getClientId();
    return fetchBackend<UserStatus>(`/users/status/${clientId}`);
};

export const getMacrosForRecipe = async (foodName: string, ingredients: string): Promise<Macros> => {
    const body = { food_name: foodName, ingredients };
    return fetchBackend<Macros>('/ai/macros_recipe', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const getMacrosForImageSingle = async (image_base64: string, mime_type: string): Promise<MacrosWithFoodName> => {
    const body = { image_base64, mime_type };
    return fetchBackend<MacrosWithFoodName>('/ai/macros_image_single', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const getMacrosForImageMultiple = async (image_base64: string, mime_type: string): Promise<EstimatedFoodItem[]> => {
    const body = { image_base64, mime_type };
    return fetchBackend<EstimatedFoodItem[]>('/ai/macros_image_multiple', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const body = { food_name: foodName, quantity_description: quantityDescription };
    const response = await fetchBackend<GramsResponse>('/ai/grams_natural_language', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    if (!response) {
        throw new Error("Received unexpected null response while estimating grams.");
    }
    return response.grams;
};

export const getFoodIcon = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
    const encodedFoodName = encodeURIComponent(foodName);
    const encodedLocale = encodeURIComponent(locale);
    try {
        const response = await fetchBackend<IconResponse>(`/icons/food?food_name=${encodedFoodName}&locale=${encodedLocale}`);
         if (!response) {
            console.warn(`Received null response when fetching icon for ${foodName}. Treating as no icon found.`);
            return null;
         }
        return response.icon_url;
    } catch (error) {
         console.error(`Failed to get icon for ${foodName} via backend service:`, error);
         return null;
    }
};

/**
 * Adds a specified amount of coins to the current user via the backend.
 * @param amount The number of coins to add.
 * @returns A promise resolving to the updated UserStatus (client_id, coins).
 */
export const addCoinsToUser = async (amount: number): Promise<UserStatus> => {
    const clientId = await getClientId(); // Client ID is needed for the endpoint URL
    const body = { amount }; // Amount goes into the body as per updated backend endpoint
    return fetchBackend<UserStatus>(`/users/add_coins/${clientId}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

// ---------- END backendService.ts ----------