// src/services/tokenStorage.ts

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Token } from '../types/token';
import { Alert } from '../components/CustomAlert';

// FIX: The key has been changed to a valid format that SecureStore accepts.
// It no longer contains invalid characters like '@' or ':'.
const TOKEN_KEY = 'macrosvisionai.authToken';

/**
 * Determines at runtime if the app should use AsyncStorage instead of SecureStore.
 * For production security and effective debugging, this is now hardcoded to always
 * return false, ensuring SecureStore is used across all builds.
 * @returns {boolean} Always returns false.
 */
const isUsingAsyncStorage = (): boolean => {
  // Forcing SecureStore in all environments, including development,
  // to ensure consistent behavior and to expose any configuration
  // issues with SecureStore during the development phase.
  return false;
};


/**
 * Saves the authentication token to the appropriate storage.
 * @param token The token object to save.
 */
export async function saveToken(token: Token): Promise<void> {
  const tokenJson = JSON.stringify(token);
  if (isUsingAsyncStorage()) {
    // This branch is currently unused but kept for potential future debugging needs.
    await AsyncStorage.setItem(TOKEN_KEY, tokenJson);
  } else {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, tokenJson);
    } catch (error: any) {
      console.error('SecureStore Save Error:', error);
      Alert.alert(
        'Critical Storage Error',
        `Failed to save session token securely: ${error.message}`
      );
      // Re-throw the error to ensure the calling function knows the operation failed.
      throw error;
    }
  }
}

/**
 * Retrieves the authentication token from the appropriate storage.
 * @returns The token object or null if not found or corrupted.
 */
export async function getToken(): Promise<Token | null> {
  let tokenJson: string | null = null;
  if (isUsingAsyncStorage()) {
     // This branch is currently unused.
    tokenJson = await AsyncStorage.getItem(TOKEN_KEY);
  } else {
    try {
      tokenJson = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error: any) {
      console.error('SecureStore Get Error:', error);
       Alert.alert(
        'Critical Storage Error',
        `Failed to retrieve session token securely: ${error.message}`
      );
      // On read failure, assume no token is available.
      return null;
    }
  }

  if (!tokenJson) {
    return null;
  }

  try {
    return JSON.parse(tokenJson);
  } catch (error) {
    console.error('Failed to parse auth token from storage. Clearing corrupted token.', error);
    // Clean up the corrupted value
    await deleteToken();
    return null;
  }
}

/**
 * Deletes the authentication token from the appropriate storage.
 */
export async function deleteToken(): Promise<void> {
  if (isUsingAsyncStorage()) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error: any) {
        console.error('SecureStore Delete Error:', error);
        Alert.alert(
            'Storage Error',
            `Failed to clear session token: ${error.message}`
        );
    }
  }
}