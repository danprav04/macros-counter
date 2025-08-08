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

// Use the library's TestIds for development.
// Replace these with your actual AdMob Ad Unit IDs before production.
const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
  ? 'YOUR_IOS_REWARDED_AD_UNIT_ID'
  : 'YOUR_ANDROID_REWARDED_AD_UNIT_ID';

let isAdShowing = false;

/**
 * Shows a rewarded ad using the secure Server-Side Verification (SSV) flow.
 * @param userId The current user's ID, required for the SSV callback.
 * @returns A promise that resolves to true if the ad was shown and closed, false otherwise.
 *          Note: The actual reward is granted by the backend, this only signals UI refresh.
 */
export const showRewardedAd = (userId: string): Promise<boolean> => {
  return new Promise(async (resolve) => {
    if (isAdShowing) {
      console.warn('An ad is already being shown.');
      return resolve(false);
    }

    try {
      isAdShowing = true;
      
      // Step 1: Get the unique nonce from our backend
      const { nonce } = await startRewardAdProcess();

      const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        serverSideVerificationOptions: {
          userId: userId,
          customData: nonce,
        },
      });

      // FIX: Store the unsubscribe functions directly
      const unsubscribeLoad = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('AdMob: Rewarded Ad loaded, attempting to show.');
          rewardedAd.show();
        }
      );

      const unsubscribeEarned = rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log(
            `AdMob: User earned reward of ${reward.amount} ${reward.type}. Backend verification will handle coin grant.`
          );
        }
      );

      const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('AdMob: Ad dismissed.');
        isAdShowing = false;
        // FIX: Call the unsubscribe functions
        unsubscribeLoad();
        unsubscribeEarned();
        unsubscribeClosed();
        resolve(true); // Ad was shown and closed, UI can refresh.
      });

      const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('AdMob: Ad event error.', error);
        
        let errorMessage = t('ads.error.loadFailed');
        if (error && 'message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
        }

        Alert.alert(t('ads.error.title'), errorMessage);
        isAdShowing = false;
        // FIX: Call the unsubscribe functions
        unsubscribeLoad();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        resolve(false);
      });

      // Step 2: Start loading the ad
      rewardedAd.load();

    } catch (error: any) {
      console.error('Error in showRewardedAd flow:', error);
      Alert.alert(t('ads.error.title'), error.message || t('ads.error.unknown'));
      isAdShowing = false;
      resolve(false);
    }
  });
};