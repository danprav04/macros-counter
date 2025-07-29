// src/services/tokenStorage.ts

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Token } from '../types/token';

const TOKEN_KEY = '@MacroTracker:authToken';

/**
 * Checks if the app is running inside the generic Expo Go client.
 * SecureStore is not truly secure in Expo Go because the app shares a generic
 * bundle identifier. We fall back to AsyncStorage in this specific case.
 * In development builds and production, this will be false.
 */
const IS_EXPO_GO = Constants.appOwnership === 'expo';

if (__DEV__) {
  console.log(
    `[TokenStorage] Running in ${IS_EXPO_GO ? 'Expo Go' : 'Development Build/Production'}. ` +
    `Using ${IS_EXPO_GO ? 'AsyncStorage (unsafe)' : 'SecureStore (secure)'} for tokens.`
  );
}

/**
 * Saves the authentication token to the appropriate storage.
 * @param token The token object to save.
 */
export async function saveToken(token: Token): Promise<void> {
  const tokenJson = JSON.stringify(token);
  if (IS_EXPO_GO) {
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
  if (IS_EXPO_GO) {
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
  if (IS_EXPO_GO) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}