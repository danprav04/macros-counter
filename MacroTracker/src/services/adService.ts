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

const adUnitIdForSsvTesting = 'ca-app-pub-5977125521868950/6021803585';
const adUnitId = __DEV__ ? adUnitIdForSsvTesting : 'ca-app-pub-5977125521868950/6021803585';


let isAdShowing = false;
let isSdkInitialized = false;

export const initializeAds = (): void => {
  if (__DEV__ && adUnitId === adUnitIdForSsvTesting) {
    console.warn(
      '--- Ad Service Notice --- Using real Ad Unit ID for testing SSV. ' +
      'Ensure your device is registered as a test device in the AdMob console ' +
      'to avoid policy violations. Non-test devices serving real ads in debug ' +
      'builds can lead to account suspension.'
    );
  } else if (__DEV__) {
    console.log('--- Ad Service Notice --- Using Test Ad Unit ID for development. SSV will not trigger.');
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
            Alert.alert(t('ads.error.title'), error.message || t('ads.error.unknown'));
            isAdShowing = false;
            resolve(false);
        }
    };
    
    processAd();
  });
};