// src/services/backendService.ts
import { Alert } from '../components/CustomAlert';
import * as authService from './authService';
import { getClientId } from './clientIDService';
import { MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { t } from '../localization/i18n';
import { User } from '../types/user';
import { AppCosts } from '../types/settings';

export class BackendError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'BackendError';
  }
}

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

        if (response.status === 401 && retry) {
            if (tokenData?.refresh_token){
                const newTokens = await authService.refreshAuthToken(tokenData.refresh_token);
                if (newTokens) {
                    await authService.setAuthToken(newTokens);
                    return await fetchBackend(endpoint, options, false);
                }
            }
            authService.triggerLogout();
            throw new BackendError(t('backendService.errorAuthFailed'), 401);
        }
        
        if (response.status === 204) {
             return null as T;
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            if (response.ok) {
                return null as T;
            }
            throw new BackendError(t('backendService.errorServerUnreadable'), response.status);
        }

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
        
        throw new BackendError(userFriendlyMessage, 0);
    }
}

// App configuration endpoint - now includes tos_current_version
export const getAppConfig = (): Promise<{ current_version: string; tos_current_version: string }> => fetchBackend('/app/version', {}, false);

// App costs endpoint
export const getAppCosts = (): Promise<AppCosts> => fetchBackend('/app/costs', {}, false);

export const getUserStatus = (): Promise<User> => fetchBackend('/users/status');
export const resendVerificationEmail = (): Promise<{ message: string }> => fetchBackend('/users/resend-verification-email', { method: 'POST' });
export const startRewardAdProcess = (): Promise<{ nonce: string }> => fetchBackend('/users/reward-ad-start', { method: 'POST' });
export const getMacrosForRecipe = (foodName: string, ingredients: string): Promise<MacrosWithFoodName> => fetchBackend('/ai/macros_recipe', { method: 'POST', body: JSON.stringify({ food_name: foodName, ingredients }) });
export const estimateGramsNaturalLanguage = async (foodName: string, quantityDescription: string): Promise<number> => {
    const response = await fetchBackend<{ grams: number }>('/ai/grams_natural_language', { method: 'POST', body: JSON.stringify({ food_name: foodName, quantity_description: quantityDescription }) });
    if (typeof response?.grams !== 'number') {
        throw new BackendError(t('utils.units.invalidResponse'), 500);
    }
    return response.grams;
};
export const getMacrosForImageSingle = (base64Image: string, mimeType: string): Promise<MacrosWithFoodName> => fetchBackend('/ai/macros_image_single', { method: 'POST', body: JSON.stringify({ image_base64: base64Image, mime_type: mimeType }) });
export const getMacrosForImageMultiple = (base64Image: string, mimeType: string): Promise<EstimatedFoodItem[]> => fetchBackend('/ai/macros_image_multiple', { method: 'POST', body: JSON.stringify({ image_base64: base64Image, mime_type: mimeType }) });
export const getMacrosForImageMultipleBatch = (images: { image_base64: string, mime_type: string }[]): Promise<EstimatedFoodItem[]> => fetchBackend('/ai/macros_image_multiple_batch', { method: 'POST', body: JSON.stringify({ images }) });
export const getMacrosForTextMultiple = (text: string): Promise<EstimatedFoodItem[]> => fetchBackend('/ai/macros_text_multiple', { method: 'POST', body: JSON.stringify({ text }) });
export const deleteCurrentUserAccount = (password: string): Promise<null> => fetchBackend('/users/me', { method: 'DELETE', body: JSON.stringify({ password }) });

export const updateUserCompliance = (data: {
    tos_agreed_at?: string;
    tos_version?: string;
    consent_health_data_at?: string;
    consent_data_transfer_at?: string;
    acknowledged_not_medical_device_at?: string;
    agreed_to_human_in_the_loop_at?: string;
}): Promise<User> => fetchBackend('/users/update-compliance', { method: 'POST', body: JSON.stringify(data) });

// Purchase Verification
export interface PurchaseVerificationResult {
    success: boolean;
    new_balance: number;
    message: string;
    coins_added: number;
}

export const verifyPurchase = (data: {
    platform: 'android' | 'ios';
    productId: string;
    transactionId: string;
    purchaseToken?: string;
    receiptData?: string;
}): Promise<PurchaseVerificationResult> => fetchBackend('/payments/verify-purchase', { method: 'POST', body: JSON.stringify({
    platform: data.platform,
    product_id: data.productId,
    transaction_id: data.transactionId,
    purchase_token: data.purchaseToken,
    receipt_data: data.receiptData
}) });