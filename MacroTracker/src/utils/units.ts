// src/utils/units.ts
import { Alert } from 'react-native';
import { estimateGramsNaturalLanguage, BackendError } from '../services/backendService';
import { t } from '../localization/i18n';
import { showRewardedAd } from '../services/adService'; // Import the ad service

export async function getGramsFromNaturalLanguage(
    foodName: string,
    quantityDescription: string,
    userId: string | null, // Add userId
    onReward: () => void // Add onReward callback
): Promise<number> {
    try {
        const grams = await estimateGramsNaturalLanguage(foodName, quantityDescription);
        return grams;
    } catch (error) {
        if (error instanceof BackendError && error.status === 402 && userId) {
            Alert.alert(
                t('ads.watchAdPromptTitle'),
                t('ads.watchAdPromptMessage'),
                [
                    { text: t('confirmationModal.cancel'), style: 'cancel' },
                    {
                        text: t('ads.watchAdButton'),
                        onPress: async () => {
                            const success = await showRewardedAd(userId);
                            if (success) {
                                onReward();
                            }
                        },
                    },
                ]
            );
        } else {
            const message = error instanceof BackendError ? error.message : t('errors.unexpectedError');
            Alert.alert(t('utils.units.errorTitle'), message);
        }
        throw error;
    }
}