// src/utils/macros.ts
import { Alert } from '../components/CustomAlert';
import { getMacrosForRecipe, getMacrosForImageSingle, getMacrosForImageMultiple, getMacrosForTextMultiple, getMacrosForImageMultipleBatch, BackendError } from '../services/backendService';
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { ImagePickerAsset } from 'expo-image-picker';
import { getBase64FromUri } from './imageUtils';
import { t } from '../localization/i18n';
import { showRewardedAd } from '../services/adService';

export function determineMimeType(asset: { uri: string; mimeType?: string | null; fileName?: string | null; }): string {
    if (asset.mimeType && asset.mimeType.includes('/')) return asset.mimeType;
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        default: return 'image/jpeg';
    }
}

export function areMacrosSimilar(
    food1: { calories: number; protein: number; carbs: number; fat: number },
    food2: { calories: number; protein: number; carbs: number; fat: number }
): boolean {
    const isSimilar = (a: number, b: number, margin = 0.15, minDiff = 5) => {
        const diff = Math.abs(a - b);
        return diff <= minDiff || diff <= Math.max(a, b) * margin;
    };

    return (
        isSimilar(food1.calories, food2.calories, 0.15, 20) &&
        isSimilar(food1.protein, food2.protein, 0.15, 5) &&
        isSimilar(food1.carbs, food2.carbs, 0.15, 5) &&
        isSimilar(food1.fat, food2.fat, 0.15, 5)
    );
}

const handleError = (error: unknown, title: string, userId?: string | null, onReward?: () => void) => {
    if (error instanceof BackendError && error.status === 402 && userId && onReward) {
        Alert.alert(
            t('ads.watchAdPromptTitle'),
            t('ads.watchAdPromptMessage'),
            [
                { text: t('confirmationModal.cancel'), style: 'cancel' },
                {
                    text: t('ads.watchAdButton'),
                    onPress: async () => {
                        const success = await showRewardedAd(userId);
                        if (success && onReward) {
                            onReward();
                        }
                    },
                },
            ]
        );
    } else {
        const message = error instanceof BackendError ? error.message : t('errors.unexpectedError');
        Alert.alert(title, message);
    }
};

export async function getMacrosFromText(foodName: string, ingredients: string, userId?: string | null, onReward?: () => void): Promise<MacrosWithFoodName> {
    try {
        const onRetry = () => getMacrosFromText(foodName, ingredients, userId, onReward);
        return await getMacrosForRecipe(foodName, ingredients);
    } catch (error) {
        const onRetry = () => getMacrosFromText(foodName, ingredients, userId, onReward);
        handleError(error, t('utils.macros.errorTitle'), userId, onRetry);
        throw error;
    }
}

export async function getMacrosForImageFile(asset: ImagePickerAsset, userId?: string | null, onReward?: () => void): Promise<MacrosWithFoodName> {
    try {
        const base64File = await getBase64FromUri(asset.uri);
        const mimeType = determineMimeType(asset);
        return await getMacrosForImageSingle(base64File, mimeType);
    } catch (error) {
        const onRetry = () => getMacrosForImageFile(asset, userId, onReward);
        handleError(error, t('utils.macros.errorTitle'), userId, onRetry);
        throw error;
    }
}

export async function getMultipleFoodsFromMultipleImages(images: { image_base64: string, mime_type: string }[], userId?: string | null, onReward?: () => void): Promise<EstimatedFoodItem[]> {
    try {
        const results = await getMacrosForImageMultipleBatch(images);
        if (!Array.isArray(results)) {
            throw new Error(t('utils.macros.invalidResponse'));
        }
        return results;
    } catch (error) {
        const onRetry = () => getMultipleFoodsFromMultipleImages(images, userId, onReward);
        handleError(error, t('utils.macros.multiItemErrorTitle'), userId, onRetry);
        throw error;
    }
}


export async function getMultipleFoodsFromText(text: string, userId?: string | null, onReward?: () => void): Promise<EstimatedFoodItem[]> {
    try {
        const results = await getMacrosForTextMultiple(text);
        if (!Array.isArray(results)) throw new Error(t('utils.macros.invalidResponse'));
        return results;
    } catch (error) {
        const onRetry = () => getMultipleFoodsFromText(text, userId, onReward);
        handleError(error, t('utils.macros.multiItemErrorTitle'), userId, onRetry);
        throw error;
    }
}

export { BackendError, EstimatedFoodItem, Macros, MacrosWithFoodName };