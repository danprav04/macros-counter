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

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
  ? 'ca-app-pub-5977125521868950/6021803585'
  : 'ca-app-pub-5977125521868950/6021803585';

let isAdShowing = false;
let isSdkInitialized = false;

export const initializeAds = (): void => {
  mobileAds()
    .initialize()
    .then((adapterStatuses: AdapterStatus[]) => {
      console.log('Google Mobile Ads SDK initialization status:', adapterStatuses);
      
      // Find the status for the main Google Mobile Ads adapter from the array.
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


export const showRewardedAd = (userId: string): Promise<boolean> => {
  return new Promise(async (resolve) => {
    if (isAdShowing) {
      console.warn('An ad is already being shown.');
      return resolve(false);
    }

    if (!isSdkInitialized) {
      Alert.alert(t('ads.error.title'), t('ads.error.sdkFailed'));
      console.error('Attempted to show ad before SDK was initialized and ready.');
      return resolve(false);
    }

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
          console.log(`AdMob: User earned reward of ${reward.amount} ${reward.type}.`);
          rewardEarned = true;
        }),
        rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
          isAdShowing = false;
          listeners.forEach(unsubscribe => unsubscribe());
          resolve(rewardEarned);
        }),
        rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
          const errorMessage = error?.message || t('ads.error.loadFailed');
          Alert.alert(t('ads.error.title'), errorMessage);
          isAdShowing = false;
          listeners.forEach(unsubscribe => unsubscribe());
          resolve(false);
        })
      ];

      rewardedAd.load();

    } catch (error: any) {
      Alert.alert(t('ads.error.title'), error.message || t('ads.error.unknown'));
      isAdShowing = false;
      resolve(false);
    }
  });
};