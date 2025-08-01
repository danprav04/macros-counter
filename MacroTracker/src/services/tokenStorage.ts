// src/services/tokenStorage.ts

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Token } from '../types/token';

const TOKEN_KEY = '@MacroTracker:authToken';

/**
 * Checks if the app is running in a development environment where SecureStore might
 * not be ideal or available (like Expo Go). In these cases, we fall back to AsyncStorage.
 * In production builds, this will be false, and SecureStore will be used.
 */
const USE_ASYNC_STORAGE = __DEV__;

if (__DEV__) {
  console.log(
    `[TokenStorage] Running in Development. ` +
    `Using ${USE_ASYNC_STORAGE ? 'AsyncStorage (unsafe)' : 'SecureStore (secure)'} for tokens.`
  );
}

/**
 * Saves the authentication token to the appropriate storage.
 * @param token The token object to save.
 */
export async function saveToken(token: Token): Promise<void> {
  const tokenJson = JSON.stringify(token);
  if (USE_ASYNC_STORAGE) {
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
  if (USE_ASYNC_STORAGE) {
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
  if (USE_ASYNC_STORAGE) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}