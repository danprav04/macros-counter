// src/services/adService.ts
import { Alert } from '../components/CustomAlert';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  AdapterStatus,
} from 'react-native-google-mobile-ads';
import { startRewardAdProcess } from './backendService';
import { t } from '../localization/i18n';

// Use the official test ID for development to prevent policy violations.
const productionAdUnitId = 'ca-app-pub-5977125521868950/6021803585';
const adUnitId = __DEV__ ? TestIds.REWARDED : productionAdUnitId;

let isAdShowing = false;
let isSdkInitialized = false;

// Listener for loading state
type AdLoadingListener = (isLoading: boolean) => void;
let adLoadingListener: AdLoadingListener | null = null;

export const setAdLoadingListener = (listener: AdLoadingListener | null) => {
    adLoadingListener = listener;
};

const notifyLoading = (isLoading: boolean) => {
    if (adLoadingListener) {
        adLoadingListener(isLoading);
    }
};

export const initializeAds = (): void => {
  if (__DEV__) {
    console.log('--- Ad Service Notice --- Using Test Ad Unit ID for development. Real SSV will not trigger.');
  }

  mobileAds()
    .initialize()
    .then((adapterStatuses: AdapterStatus[]) => {
      console.log('Google Mobile Ads SDK initialization status:', adapterStatuses);
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

export const showRewardedAd = (userId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isAdShowing) {
      console.warn('An ad is already being shown.');
      resolve(false);
      return;
    }

    if (!isSdkInitialized) {
      Alert.alert(t('ads.error.title'), t('ads.error.sdkFailed'));
      console.error('Attempted to show ad before SDK was initialized and ready.');
      resolve(false);
      return;
    }

    const processAd = async () => {
        try {
            isAdShowing = true;
            notifyLoading(true); // Start loading indicator
            
            const { nonce } = await startRewardAdProcess();
            const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
                serverSideVerificationOptions: {
                    userId: userId,
                    customData: nonce,
                },
            });

            let rewardEarned = false;

            const unsubscribeLoad = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
                console.log('Rewarded ad loaded, now showing.');
                notifyLoading(false); // Stop loading indicator before showing ad
                rewardedAd.show();
            });

            const unsubscribeEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
                console.log(`AdMob Client Event: User earned reward of ${reward.amount} ${reward.type}. Waiting for server verification.`);
                rewardEarned = true;
            });

            const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
                isAdShowing = false;
                unsubscribeAll();
                resolve(rewardEarned);
            });

            const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('Ad failed to load or show:', error);
                notifyLoading(false); // Stop loading indicator on error
                const errorMessage = error?.message || t('ads.error.loadFailed');
                Alert.alert(t('ads.error.title'), errorMessage);
                isAdShowing = false;
                unsubscribeAll();
                resolve(false);
            });
            
            const unsubscribeAll = () => {
                unsubscribeLoad();
                unsubscribeEarned();
                unsubscribeClosed();
                unsubscribeError();
            };

            rewardedAd.load();

        } catch (error: any) {
            notifyLoading(false); // Stop loading indicator on catch
            Alert.alert(t('ads.error.title'), error.message || t('ads.error.unknown'));
            isAdShowing = false;
            resolve(false);
        }
    };
    
    processAd();
  });
};