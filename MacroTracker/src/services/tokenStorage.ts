// src/services/tokenStorage.ts

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Token } from '../types/token';

const TOKEN_KEY = '@MacroTracker:authToken';

/**
 * Determines at runtime if the app should use AsyncStorage instead of SecureStore.
 * This is typically true for development environments like Expo Go where SecureStore might not be available.
 * In production builds (appOwnership === 'standalone'), this will return false.
 * @returns {boolean} True if AsyncStorage should be used, false for SecureStore.
 */
const isUsingAsyncStorage = (): boolean => {
  const shouldUseAsync = __DEV__ && (Constants.expoConfig as any)?.appOwnership !== 'standalone';
  
  // This log is useful for debugging which storage is being used during tests.
  if (process.env.JEST_WORKER_ID !== undefined) { 
      console.log(
        `[TokenStorage] Running in test (appOwnership: ${(Constants.expoConfig as any)?.appOwnership}). ` +
        `Using ${shouldUseAsync ? 'AsyncStorage (unsafe)' : 'SecureStore (secure)'} for tokens.`
      );
  }

  return shouldUseAsync;
};


/**
 * Saves the authentication token to the appropriate storage.
 * @param token The token object to save.
 */
export async function saveToken(token: Token): Promise<void> {
  const tokenJson = JSON.stringify(token);
  if (isUsingAsyncStorage()) {
    await AsyncStorage.setItem(TOKEN_KEY, tokenJson);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, tokenJson);
  }
}

/**
 * Retrieves the authentication token from the appropriate storage.
 * @returns The token object or null if not found or corrupted.
 */
export async function getToken(): Promise<Token | null> {
  let tokenJson: string | null = null;
  if (isUsingAsyncStorage()) {
    tokenJson = await AsyncStorage.getItem(TOKEN_KEY);
  } else {
    tokenJson = await SecureStore.getItemAsync(TOKEN_KEY);
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
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}