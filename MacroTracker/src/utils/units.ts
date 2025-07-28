// src/utils/units.ts
import { Alert } from 'react-native';
import { estimateGramsNaturalLanguage, BackendError } from '../services/backendService';
import { t } from '../localization/i18n';

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
            : t('errors.unexpectedError');
        Alert.alert(t('utils.units.errorTitle'), message);
        throw error;
    }
}