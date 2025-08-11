// src/services/adService.ts
import { Alert, Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { startRewardAdProcess } from './backendService';
import { t } from '../localization/i18n';

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
  ? 'YOUR_IOS_REWARDED_AD_UNIT_ID'
  : 'YOUR_ANDROID_REWARDED_AD_UNIT_ID';

let isAdShowing = false;

export const showRewardedAd = (userId: string): Promise<boolean> => {
  return new Promise(async (resolve) => {
    if (isAdShowing) {
      console.warn('An ad is already being shown.');
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

      const listeners = [
        rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
          rewardedAd.show();
        }),
        rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
          console.log(`AdMob: User earned reward of ${reward.amount} ${reward.type}.`);
        }),
        rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
          isAdShowing = false;
          listeners.forEach(unsubscribe => unsubscribe());
          resolve(true);
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