// src/services/adService.ts
import { Alert, Platform } from 'react-native';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  AdapterStatus,
} from 'react-native-google-mobile-ads';
import { startRewardAdProcess } from './backendService';
import { t } from '../localization/i18n';

// --- PRODUCTION-READY AD UNIT ID LOGIC ---
// We will now ALWAYS use the real Ad Unit ID.
// AdMob automatically serves safe, non-revenue generating "test ads" to devices
// that have been added to the "Test Devices" list in the AdMob console.
// Using the real ID is the ONLY way to test the Server-Side Verification (SSV) flow.
const adUnitId = 'ca-app-pub-5977125521868950/6021803585';

let isAdShowing = false;
let isSdkInitialized = false;

export const initializeAds = (): void => {
  if (__DEV__) {
      console.warn(
          '--- Ad Service Notice --- Using real Ad Unit ID for testing SSV. ' +
          'Ensure your device is registered as a test device in the AdMob console to avoid policy violations.'
      );
  }
  mobileAds()
    .initialize()
    .then((adapterStatuses: AdapterStatus[]) => {
      console.log('Google Mobile Ads SDK initialization status:', adapterStatuses);
      
      const googleAdapterStatus = adapterStatuses.find(
        (adapter) => adapter.name === 'com.google.android.gms.ads.MobileAds'
      );

      if (googleAdapterStatus && googleAdapterStatus.state === 1) { // State 1 means READY
          isSdkInitialized = true;
          console.log('Ad service is ready.');
      } else {
          console.warn('Ad service initialized but not ready. Ads may fail to load.', googleAdapterStatus);
      }
    })
    .catch(error => {
      console.error('Error initializing Google Mobile Ads SDK:', error);
      Alert.alert(t('ads.error.title'), t('ads.error.sdkFailed'));
    });
};


/**
 * Shows a rewarded ad.
 * @param userId The current user's client_id for SSV.
 * @param onAdClosed A callback function that is triggered when the ad is closed. It receives a boolean indicating if the user earned a reward on the client-side.
 */
export const showRewardedAd = (userId: string, onAdClosed: (rewardEarned: boolean) => void): void => {
    if (isAdShowing) {
      console.warn('An ad is already being shown.');
      onAdClosed(false);
      return;
    }

    if (!isSdkInitialized) {
      Alert.alert(t('ads.error.title'), t('ads.error.sdkFailed'));
      console.error('Attempted to show ad before SDK was initialized and ready.');
      onAdClosed(false);
      return;
    }

    const processAd = async () => {
        try {
            isAdShowing = true;
            
            const { nonce } = await startRewardAdProcess();
            const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
                serverSideVerificationOptions: {
                    userId: userId,
                    customData: nonce,
                },
            });

            let rewardEarned = false;

            const listeners = [
                rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
                    rewardedAd.show();
                }),
                rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
                    console.log(`AdMob Client Event: User earned reward of ${reward.amount} ${reward.type}. Waiting for server verification.`);
                    rewardEarned = true;
                }),
                rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
                    isAdShowing = false;
                    listeners.forEach(unsubscribe => unsubscribe());
                    onAdClosed(rewardEarned);
                }),
                rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
                    console.error('Ad failed to load or show:', error);
                    const errorMessage = error?.message || t('ads.error.loadFailed');
                    Alert.alert(t('ads.error.title'), errorMessage);
                    isAdShowing = false;
                    listeners.forEach(unsubscribe => unsubscribe());
                    onAdClosed(false);
                })
            ];

            rewardedAd.load();

        } catch (error: any) {
            Alert.alert(t('ads.error.title'), error.message || t('ads.error.unknown'));
            isAdShowing = false;
            onAdClosed(false);
        }
    };
    
    processAd();
};