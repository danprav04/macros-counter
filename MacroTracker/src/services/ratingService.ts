// src/services/ratingService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { loadDailyEntries } from './storageService';

const RATING_DISMISSED_KEY = '@MacroTracker:ratingDismissed';
const RATING_REMIND_LATER_KEY = '@MacroTracker:ratingRemindLaterDate';
const RATING_COMPLETED_KEY = '@MacroTracker:ratingCompleted';

const DAYS_WITH_LOGS_BEFORE_PROMPT = 3;
const REMIND_LATER_DAYS = 2;

// Google Play Store URL
const PLAY_STORE_URL = 'market://details?id=com.macrosvisionai.app';
const PLAY_STORE_WEB_URL = 'https://play.google.com/store/apps/details?id=com.macrosvisionai.app';

/**
 * Checks if the rating prompt should be shown
 * Returns true if:
 * - User has logged food on 3+ distinct days
 * - User hasn't dismissed permanently
 * - User hasn't already rated
 * - If remind later was clicked, enough time has passed
 */
export const shouldShowRatingPrompt = async (): Promise<boolean> => {
  try {
    // Check if user already rated or dismissed permanently
    const [ratingCompleted, ratingDismissed] = await Promise.all([
      AsyncStorage.getItem(RATING_COMPLETED_KEY),
      AsyncStorage.getItem(RATING_DISMISSED_KEY),
    ]);

    if (ratingCompleted === 'true' || ratingDismissed === 'true') {
      return false;
    }

    // Check remind later date
    const remindLaterDate = await AsyncStorage.getItem(RATING_REMIND_LATER_KEY);
    if (remindLaterDate) {
      const remindDate = new Date(remindLaterDate);
      if (new Date() < remindDate) {
        return false;
      }
    }

    // Count distinct days with logged entries
    const dailyEntries = await loadDailyEntries();
    const daysWithEntries = dailyEntries.filter(entry => entry.items && entry.items.length > 0).length;

    return daysWithEntries >= DAYS_WITH_LOGS_BEFORE_PROMPT;
  } catch (error) {
    console.error('Error checking rating prompt status:', error);
    return false;
  }
};

/**
 * Handles the "Remind Me Later" action
 */
export const handleRemindLater = async (): Promise<void> => {
  try {
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + REMIND_LATER_DAYS);
    await AsyncStorage.setItem(RATING_REMIND_LATER_KEY, remindDate.toISOString());
  } catch (error) {
    console.error('Error setting remind later:', error);
  }
};

/**
 * Handles the "Don't Ask Again" / Dismiss action
 */
export const handleDismissRating = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RATING_DISMISSED_KEY, 'true');
  } catch (error) {
    console.error('Error dismissing rating:', error);
  }
};

/**
 * Handles the "Rate Now" action - opens Play Store and marks as completed
 */
export const handleRateNow = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RATING_COMPLETED_KEY, 'true');
    
    if (Platform.OS === 'android') {
      // Try to open in Play Store app first
      const canOpen = await Linking.canOpenURL(PLAY_STORE_URL);
      if (canOpen) {
        await Linking.openURL(PLAY_STORE_URL);
      } else {
        // Fallback to web URL
        await Linking.openURL(PLAY_STORE_WEB_URL);
      }
    }
  } catch (error) {
    console.error('Error opening Play Store:', error);
    // Still mark as completed to avoid annoying the user
  }
};
