// src/utils/macros.ts
// src/utils/macros.ts
import * as FileSystem from 'expo-file-system';
import {
    getMacrosForRecipe,
    getMacrosForImageSingle,
    getMacrosForImageMultiple,
    BackendError
} from '../services/backendService';
import { Alert } from 'react-native';
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { ImagePickerAsset } from 'expo-image-picker';
import { getBase64FromUri } from './imageUtils';
import { t } from '../localization/i18n'; // Import t

export function determineMimeType(asset: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
}): string {
    if (asset.mimeType && asset.mimeType.includes('/')) return asset.mimeType;
    const uriParts = asset.uri.split('.');
    const extension = uriParts.pop()?.toLowerCase();
    switch (extension) {
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'bmp': return 'image/bmp';
        default: return 'image/jpeg';
    }
}

export async function getMacrosFromText(
    foodName: string,
    ingredients: string
): Promise<Macros> {
    try {
        const macros = await getMacrosForRecipe(foodName, ingredients);
        return macros;
    } catch (error) {
        const message = error instanceof BackendError
            ? error.message
            : t('utils.macros.errorGetMacrosRecipe', { error: error instanceof Error ? error.message : String(error) });
        Alert.alert(t('utils.macros.alertAiErrorRecipe'), message);
        throw error;
    }
}

export async function getMacrosForImageFile(asset: ImagePickerAsset): Promise<MacrosWithFoodName> {
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
    } catch (err) {
        Alert.alert(t('utils.macros.alertImageReadError'), err instanceof Error ? err.message : t('utils.macros.alertImageReadErrorMessage'));
        throw err;
    }
    const mimeType = determineMimeType(asset);
    try {
        const result = await getMacrosForImageSingle(base64File, mimeType);
        return result;
    } catch (error) {
        const message = error instanceof BackendError
            ? error.message
            : t('utils.macros.errorImageAnalysis', { error: error instanceof Error ? error.message : String(error) });
        Alert.alert(t('utils.macros.alertAnalysisFailedSingle'), message);
        throw error;
    }
}

export async function getMultipleFoodsFromImage(base64Image: string, mimeType: string): Promise<EstimatedFoodItem[]> {
    try {
        const results = await getMacrosForImageMultiple(base64Image, mimeType);
        if (!Array.isArray(results)) {
            throw new Error(t('utils.macros.errorInvalidResponseMultiple'));
        }
        return results;
    } catch (error) {
         const message = error instanceof BackendError
            ? error.message
            : t('utils.macros.errorCouldNotAnalyze', { error: error instanceof Error ? error.message : String(error) });
        Alert.alert(t('utils.macros.alertQuickAddFailedMulti'), message);
        throw error;
    }
}

export { BackendError, EstimatedFoodItem, Macros, MacrosWithFoodName };