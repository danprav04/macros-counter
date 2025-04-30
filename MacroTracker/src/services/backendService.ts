// ---------- src/services/backendService.ts ----------
// ---------- backendService.ts (Improved Error Handling, Logging, Auth Flag) ----------
import Constants from 'expo-constants';
import { getClientId } from './clientIDService';
import { EstimatedFoodItem, Macros, MacrosWithFoodName } from '../types/macros';
import { Platform } from 'react-native'; // For logging platform info
import uuid from 'react-native-uuid'; // Import uuid

// --- Configuration ---
const getBackendUrl = (): string => {
    // Prefer environment variable set during build (e.g., EXPO_PUBLIC_BACKEND_URL)
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (envUrl) {
        console.log("Using Backend URL from EXPO_PUBLIC_BACKEND_URL:", envUrl);
        return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
    }

    // Fallback to expoConfig (less ideal for production secrets)
    const configUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL;
    if (configUrl) {
        console.warn("Using Backend URL from app.json extra.env. Consider using build-time environment variables (EXPO_PUBLIC_*) for production.");
        return configUrl.endsWith('/api/v1') ? configUrl : `${configUrl.replace(/\/$/, '')}/api/v1`;
    }

    // Final fallback for local development (clearly indicate this)
    console.error("BACKEND_URL not found in environment variables or app.json extra.env. Using default DEVELOPMENT URL. THIS IS NOT FOR PRODUCTION.");
    // Replace with your actual development backend IP/hostname
    const DEV_URL = 'http://192.168.1.15:8000'; // Or your machine's local IP
    return `${DEV_URL}/api/v1`;
};

const BASE_URL = getBackendUrl();
console.log(`Backend Service Initialized. Base URL: ${BASE_URL}`);


// --- Interfaces ---
interface GramsResponse {
    grams: number;
}

interface IconResponse {
    icon_url: string | null;
}

export interface UserStatus {
    client_id: string; // Changed to string to match backend UUID string representation
    coins: number;
}

interface BackendErrorDetail {
    // Matches FastAPI validation error structure
    loc?: (string | number)[];
    msg?: string;
    type?: string;
}

interface BackendErrorResponse {
    detail?: string | BackendErrorDetail[]; // Can be string or validation error list
}


// --- Custom Error Class ---
export class BackendError extends Error {
    status: number;
    detail?: string | BackendErrorDetail[]; // Can be string or parsed validation errors
    requestId?: string | null; // Optional request ID from response header

    constructor(message: string, status: number, detail?: string | BackendErrorDetail[], requestId?: string | null) {
        super(message);
        this.name = 'BackendError';
        this.status = status;
        this.detail = detail;
        this.requestId = requestId;
    }
}

// --- API Call Helper ---
async function fetchBackend<T>(
    endpoint: string,
    options: RequestInit = {},
    needsAuth: boolean = true // <<< Added flag to control auth header
): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    const method = options.method || 'GET';
    let response: Response | null = null; // Define response outside try block
    let requestId: string | null = null; // For logging correlation

    console.log(`[API Request] ${method} ${url} - Starting (Auth: ${needsAuth})`);

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add platform info for backend logging/debugging
        'X-Platform': Platform.OS,
        // 'X-App-Version': Constants.expoConfig?.version || 'unknown', // Example app version
    };

    let authHeaders: HeadersInit = {};
    if (needsAuth) {
        const clientId = await getClientId(); // Fetch client ID only if needed
         // Validate client ID format before sending
        if (!uuid.validate(clientId)) {
            console.error(`[API Request] Invalid Client ID format detected: ${clientId}. Aborting request.`);
            throw new BackendError("Invalid client ID format.", 400, "Invalid client ID format.");
        }
        authHeaders = { 'X-Client-ID': clientId };
        console.log(`[API Request] Adding X-Client-ID header.`);
    }


    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...authHeaders, // Add auth headers only if needsAuth is true
            ...options.headers,
        },
        // Consider adding a timeout (if not using default)
        // signal: AbortSignal.timeout(30000), // Example 30 second timeout
    };

     // Log request body structure carefully (avoid logging full sensitive data)
     if (config.body && typeof config.body === 'string') {
          try {
              const bodyObj = JSON.parse(config.body);
              const bodyKeys = Object.keys(bodyObj);
              const bodyPreview = bodyKeys.length > 0 ? `{ keys: [${bodyKeys.join(', ')}] }` : '{}';
              console.log(`[API Request] ${method} ${url} - Body Preview: ${bodyPreview}`);
              // DEBUG only: Log snippet of body value for specific fields if safe
              // if (bodyObj.food_name) console.debug(`[API Request] Body food_name: ${String(bodyObj.food_name).substring(0, 50)}`);
              // if (bodyObj.image_base64) console.debug(`[API Request] Body image_base64: (length ${bodyObj.image_base64.length})`);
          } catch {
              console.log(`[API Request] ${method} ${url} - Body: (non-JSON or failed parse)`);
          }
     }


    try {
        response = await fetch(url, config);
        requestId = response.headers.get("X-Request-ID"); // Get request ID from response
        const status = response.status;
        const contentType = response.headers.get("content-type");

        console.log(`[API Response] ${method} ${url} - Status: ${status}, Content-Type: ${contentType}, RequestID: ${requestId || 'N/A'}`);

        // Handle No Content success case
        if (status === 204) {
             console.log(`[API Response] ${method} ${url} - Success (204 No Content)`);
             // Return null or an appropriate empty value based on expected type T
             // Casting to T might be unsafe if T doesn't expect null. Consider checking T.
             return null as T;
        }

        // Attempt to parse JSON, otherwise get text
        let responseBody: any;
        let isJson = false;
        try {
            if (contentType && contentType.includes("application/json")) {
                responseBody = await response.json();
                isJson = true;
            } else {
                responseBody = await response.text(); // Read as text for non-JSON
                console.log(`[API Response] ${method} ${url} - Received Text: ${responseBody.substring(0, 200)}...`);
            }
        } catch (parseError) {
            // Handle cases where parsing fails (e.g., empty body, malformed JSON)
            console.error(`[API Error] ${method} ${url} - Failed to parse response body (Status: ${status}):`, parseError);
             // Use raw text if available and parsing failed
            const rawText = await response.text().catch(() => '(Could not get raw text)');
            if (!response.ok) {
                throw new BackendError(`Backend request failed (Status ${status}), failed to parse response.`, status, rawText, requestId);
            } else {
                // If response was OK but parsing failed, this might be an issue
                console.warn(`[API Warning] ${method} ${url} - Status ${status} OK, but failed to parse response body.`);
                 // Depending on T, might return null or throw
                 return null as T;
            }
        }

        // Check if the response status indicates failure
        if (!response.ok) {
            let errorMessage = `Backend request failed (Status ${status})`;
            let errorDetail: string | BackendErrorDetail[] | undefined = undefined;

            if (isJson && responseBody) {
                 const errorData = responseBody as BackendErrorResponse;
                 if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail; // Use backend's string detail
                    errorDetail = errorMessage;
                 } else if (Array.isArray(errorData.detail)) {
                     // Handle validation errors
                     errorMessage = "Validation failed. Please check your input.";
                     errorDetail = errorData.detail; // Keep the array of details
                     console.warn(`[API Validation Error] ${method} ${url} - Details:`, JSON.stringify(errorDetail));
                 } else {
                      // Fallback if detail is missing or not string/array
                      errorMessage = `Backend error (Status ${status}), unexpected detail format.`;
                      errorDetail = JSON.stringify(responseBody); // Stringify the whole body as detail
                 }
            } else if (!isJson) {
                 // Use the text response as detail if it wasn't JSON
                 errorMessage = `Backend request failed (Status ${status}). Server response: ${responseBody.substring(0, 100)}...`;
                 errorDetail = responseBody;
            }

            // Specific handling for common error codes
            if (status === 401 && needsAuth) errorMessage = "Authentication failed. Invalid Client ID."; // Modify 401 message context
            if (status === 403) errorMessage = "Permission denied.";
            if (status === 404) errorMessage = "Resource not found.";
            if (status === 429) errorMessage = "Too many requests. Please try again later.";
            if (status === 402) errorMessage = "Insufficient coins for this action."; // Specific message for 402

            console.error(`[API Error] ${method} ${url} - Status: ${status}, Message: "${errorMessage}", Detail:`, errorDetail);
            throw new BackendError(errorMessage, status, errorDetail, requestId);
        }

        // Success case
        console.log(`[API Response] ${method} ${url} - Success (Status: ${status})`);
        // DEBUG only: Log successful response body snippet
        // if (isJson) console.debug(`[API Response] Body: ${JSON.stringify(responseBody).substring(0, 200)}...`);
        return responseBody as T;

    } catch (error) {
        // Log request ID if available
        const logRequestId = requestId ? ` (RequestID: ${requestId})` : '';

        if (error instanceof BackendError) {
            // Already logged in the block above
            throw error; // Re-throw known backend errors
        }

        // Handle network errors, timeouts, etc.
        console.error(`[API Network Error] ${method} ${url}${logRequestId} - Error:`, error);
        let networkErrorMessage = `Failed to communicate with the backend.`;
         if (error instanceof Error) {
             if (error.name === 'AbortError' || error.message.includes('timed out')) {
                 networkErrorMessage = 'The request timed out. Please try again.';
             } else if (error.message.includes('Network request failed')) {
                 networkErrorMessage += ' Please check your network connection.';
             } else {
                 networkErrorMessage += ` Details: ${error.message}`;
             }
         } else {
             networkErrorMessage += ' An unknown network error occurred.';
         }
        // Use status 0 or a custom code (e.g., 599) for client-side network errors
        throw new BackendError(networkErrorMessage, 0, networkErrorMessage, requestId);
    }
}

// --- Service Functions (Endpoints remain the same, auth flag used) ---

export const getUserStatus = async (): Promise<UserStatus> => {
    const clientId = await getClientId();
    // Ensure clientId is valid UUID format before sending? Backend likely handles.
    return fetchBackend<UserStatus>(`/users/status/${clientId}`, {}, true); // needsAuth = true
};

export const getMacrosForRecipe = async (foodName: string, ingredients: string): Promise<Macros> => {
    const body = { food_name: foodName, ingredients };
    return fetchBackend<Macros>('/ai/macros_recipe', {
        method: 'POST',
        body: JSON.stringify(body),
    }, true); // needsAuth = true
};

export const getMacrosForImageSingle = async (image_base64: string, mime_type: string): Promise<MacrosWithFoodName> => {
    const body = { image_base64, mime_type };
    return fetchBackend<MacrosWithFoodName>('/ai/macros_image_single', {
        method: 'POST',
        body: JSON.stringify(body),
    }, true); // needsAuth = true
};

export const getMacrosForImageMultiple = async (image_base64: string, mime_type: string): Promise<EstimatedFoodItem[]> => {
    const body = { image_base64, mime_type };
    return fetchBackend<EstimatedFoodItem[]>('/ai/macros_image_multiple', {
        method: 'POST',
        body: JSON.stringify(body),
    }, true); // needsAuth = true
};

export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const body = { food_name: foodName, quantity_description: quantityDescription };
    const response = await fetchBackend<GramsResponse>('/ai/grams_natural_language', {
        method: 'POST',
        body: JSON.stringify(body),
    }, true); // needsAuth = true
    // Handle potential null response from fetchBackend if server returned 204 or non-JSON OK
    if (response === null || typeof response.grams !== 'number') {
        console.error("Received unexpected null or invalid response format while estimating grams.");
        throw new BackendError("Failed to get grams estimation due to unexpected response.", 500, "Invalid response format");
    }
    return response.grams;
};

export const getFoodIcon = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
    const encodedFoodName = encodeURIComponent(foodName);
    const encodedLocale = encodeURIComponent(locale);
    try {
        // Expecting IconResponse = { icon_url: string | null }
        const response = await fetchBackend<IconResponse>(
            `/icons/food?food_name=${encodedFoodName}&locale=${encodedLocale}`,
            {}, // Default GET options
            false // <<< Set needsAuth = false for this endpoint
        );
        // Handle null response from fetchBackend (e.g., 204 No Content)
        if (response === null) {
            // console.log(`Received null response for icon ${foodName}, treating as not found.`);
            return null;
        }
        return response.icon_url; // Can be string or null as intended by backend
    } catch (error) {
        if (error instanceof BackendError && error.status === 404) {
             console.log(`Icon not found for ${foodName} (404).`);
             return null;
        }
        // Log other errors but return null to calling function
        console.error(`Failed to get icon for ${foodName} via backend service:`, error);
         return null;
    }
};

export const addCoinsToUser = async (amount: number): Promise<UserStatus> => {
    const clientId = await getClientId();
    const body = { amount };
    if (amount <= 0) {
        // Basic client-side validation
        throw new BackendError("Amount to add must be positive.", 400, "Amount must be positive.");
    }
    return fetchBackend<UserStatus>(`/users/add_coins/${clientId}`, {
        method: 'POST',
        body: JSON.stringify(body),
    }, true); // needsAuth = true
};