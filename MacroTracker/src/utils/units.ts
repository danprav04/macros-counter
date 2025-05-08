// src/utils/units.ts
// src/utils/units.ts
import { Alert } from 'react-native';
import { estimateGramsNaturalLanguage, BackendError } from '../services/backendService';
import { t } from '../localization/i18n'; // Import t

export async function getGramsFromNaturalLanguage(
    foodName: string,
    quantityDescription: string
): Promise<number> {
    try {
        const grams = await estimateGramsNaturalLanguage(foodName, quantityDescription);
        return grams;
    } catch (error) {
        const message = error instanceof BackendError
            ? error.message
            : t('utils.units.errorCouldNotEstimateGrams', { error: error instanceof Error ? error.message : String(error) });
        Alert.alert(t('utils.units.alertAiEstimationFailed'), message);
        throw error;
    }
}