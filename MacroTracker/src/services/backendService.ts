// src/services/backendService.ts
import { getClientId } from './clientIDService';
// Correctly import types from their new location
import { EstimatedFoodItem, Macros, MacrosWithFoodName } from '../types/macros';

// --- Configuration ---
const BASE_URL = 'http://192.168.1.15:8000/api/v1';

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

    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);
        const responseBody = await response.json();

        if (!response.ok) {
            console.error(`Backend Error (${response.status}) on ${url}:`, responseBody);
            const detail = (responseBody as BackendErrorDetail)?.detail || 'Unknown backend error';
            let message = `Backend request failed with status ${response.status}`;
            if (response.status === 402) {
                message = 'Insufficient coins.';
            } else if (typeof detail === 'string') {
                message = detail;
            }
            throw new BackendError(message, response.status, detail);
        }

        console.log(`Backend Success (${response.status}) on ${url}`);
        return responseBody as T;

    } catch (error) {
        if (error instanceof BackendError) {
            throw error;
        }
        console.error(`Network or parsing error calling ${url}:`, error);
        throw new Error(`Failed to communicate with the backend: ${error instanceof Error ? error.message : 'Unknown network error'}`);
    }
}

// --- Service Functions ---

export const getUserStatus = async (): Promise<{ client_id: string; coins: number }> => {
    const clientId = await getClientId();
    return fetchBackend<{ client_id: string; coins: number }>(`/users/status/${clientId}`);
};

export const getMacrosForRecipe = async (foodName: string, ingredients: string): Promise<Macros> => {
    const clientId = await getClientId();
    const body = { client_id: clientId, food_name: foodName, ingredients };
    // The backend endpoint returns data matching the Macros interface
    return fetchBackend<Macros>('/ai/macros_recipe', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const getMacrosForImageSingle = async (image_base64: string, mime_type: string): Promise<MacrosWithFoodName> => {
    const clientId = await getClientId();
    const body = { client_id: clientId, image_base64, mime_type };
     // The backend endpoint returns data matching the MacrosWithFoodName interface
    return fetchBackend<MacrosWithFoodName>('/ai/macros_image_single', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const getMacrosForImageMultiple = async (image_base64: string, mime_type: string): Promise<EstimatedFoodItem[]> => {
    const clientId = await getClientId();
    const body = { client_id: clientId, image_base64, mime_type };
    // The backend endpoint returns data matching the EstimatedFoodItem[] interface
    return fetchBackend<EstimatedFoodItem[]>('/ai/macros_image_multiple', {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const clientId = await getClientId();
    const body = { client_id: clientId, food_name: foodName, quantity_description: quantityDescription };
    const response = await fetchBackend<GramsResponse>('/ai/grams_natural_language', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return response.grams;
};

export const getFoodIcon = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
    const encodedFoodName = encodeURIComponent(foodName);
    const encodedLocale = encodeURIComponent(locale);
    try {
        const response = await fetchBackend<IconResponse>(`/icons/food?food_name=${encodedFoodName}&locale=${encodedLocale}`);
        return response.icon_url;
    } catch (error) {
         console.error(`Failed to get icon for ${foodName}:`, error);
         return null;
    }
};