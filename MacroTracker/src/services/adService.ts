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
      // Check if any of the adapters in the array are in the READY state (state code 1).
      isSdkInitialized = adapterStatuses.some(status => status.state === 1);
      
      if (isSdkInitialized) {
        console.log('Ad service is ready.');
      } else {
        console.warn('Ad service initialized but no adapters are ready.');
      }
    })
    .catch(error => {
      console.error('Error initializing Google Mobile Ads SDK:', error);
    });
};

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
            
            // Step 1: Get the unique nonce from your server *before* creating the ad request.
            const { nonce } = await startRewardAdProcess();

            // Step 2: Create the ad instance, passing the SSV options at creation time.
            const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
                serverSideVerificationOptions: {
                    userId: userId,
                    customData: nonce,
                },
            });

            let rewardEarned = false;

            const listeners = [
                // Step 3: Listen for the ad to load.
                rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
                    console.log('Rewarded ad loaded, now showing.');
                    // Step 4: Show the ad only after it has successfully loaded.
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

            // Step 5: Start the loading process.
            rewardedAd.load();

        } catch (error: any) {
            Alert.alert(t('ads.error.title'), error.message || t('ads.error.unknown'));
            isAdShowing = false;
            onAdClosed(false);
        }
    };
    
    processAd();
};