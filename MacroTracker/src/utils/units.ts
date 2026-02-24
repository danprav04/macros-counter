// src/utils/units.ts
import { Alert } from '../components/CustomAlert';
import { estimateGramsNaturalLanguage, BackendError } from '../services/backendService';
import { t } from '../localization/i18n';
import { showRewardedAd } from '../services/adService';

export async function getGramsFromNaturalLanguage(
    foodName: string,
    quantityDescription: string,
    userId?: string | null,
    onReward?: () => void
): Promise<number> {
    try {
        const grams = await estimateGramsNaturalLanguage(foodName, quantityDescription);
        return grams;
    } catch (error) {
        if (error instanceof BackendError && error.status === 402 && userId) {
            // Define the retry function here for clarity
            const retryAction = () => {
                // The onReward function passed in is what refreshes the user state
                // to get new coins before retrying the operation.
                if(onReward) onReward();
            };

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
                                retryAction();
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