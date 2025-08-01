// src/utils/macros.ts
import { Alert } from 'react-native';
import { getMacrosForRecipe, getMacrosForImageSingle, getMacrosForImageMultiple, getMacrosForTextMultiple, BackendError } from '../services/backendService';
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { ImagePickerAsset } from 'expo-image-picker';
import { getBase64FromUri } from './imageUtils';
import { t } from '../localization/i18n';

export function determineMimeType(asset: { uri: string; mimeType?: string | null; fileName?: string | null; }): string {
    if (asset.mimeType && asset.mimeType.includes('/')) return asset.mimeType;
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        default: return 'image/jpeg';
    }
}

const handleError = (error: unknown, title: string) => {
    const message = error instanceof BackendError ? error.message : t('utils.macros.errorMessage');
    Alert.alert(title, message);
    // The calling function is now responsible for re-throwing the error
}

export async function getMacrosFromText(foodName: string, ingredients: string): Promise<MacrosWithFoodName> {
    try {
        return await getMacrosForRecipe(foodName, ingredients);
    } catch (error) {
        handleError(error, t('utils.macros.errorTitle'));
        throw error; // Re-throw to allow caller to handle UI state and promise rejection
    }
}

export async function getMacrosForImageFile(asset: ImagePickerAsset): Promise<MacrosWithFoodName> {
    try {
        const base64File = await getBase64FromUri(asset.uri);
        const mimeType = determineMimeType(asset);
        return await getMacrosForImageSingle(base64File, mimeType);
    } catch (error) {
        handleError(error, t('utils.macros.errorTitle'));
        throw error;
    }
}

export async function getMultipleFoodsFromImage(base64Image: string, mimeType: string): Promise<EstimatedFoodItem[]> {
    try {
        const results = await getMacrosForImageMultiple(base64Image, mimeType);
        if (!Array.isArray(results)) throw new Error(t('utils.macros.invalidResponse'));
        return results;
    } catch (error) {
        handleError(error, t('utils.macros.multiItemErrorTitle'));
        throw error;
    }
}

export async function getMultipleFoodsFromText(text: string): Promise<EstimatedFoodItem[]> {
    try {
        const results = await getMacrosForTextMultiple(text);
        if (!Array.isArray(results)) throw new Error(t('utils.macros.invalidResponse'));
        return results;
    } catch (error) {
        handleError(error, t('utils.macros.multiItemErrorTitle'));
        throw error;
    }
}

export { BackendError, EstimatedFoodItem, Macros, MacrosWithFoodName };