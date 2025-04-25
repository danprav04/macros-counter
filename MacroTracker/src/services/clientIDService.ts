// src/services/clientIDService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const CLIENT_ID_KEY = '@MacroTracker:clientId';
let currentClientId: string | null = null; // In-memory cache

export const getClientId = async (): Promise<string> => {
  if (currentClientId) {
    return currentClientId;
  }

  try {
    let clientId = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = uuid.v4() as string;
      console.log('Generated new client ID:', clientId);
      await AsyncStorage.setItem(CLIENT_ID_KEY, clientId);
    } else {
      console.log('Retrieved existing client ID:', clientId);
    }
    currentClientId = clientId;
    return clientId;
  } catch (error) {
    console.error('Error handling client ID:', error);
    // Fallback or throw error depending on desired behavior
    // For now, generating a temporary one if storage fails
    return uuid.v4() as string;
  }
};

// Optional: Function to clear ID for testing
export const clearClientId = async (): Promise<void> => {
    currentClientId = null;
    try {
        await AsyncStorage.removeItem(CLIENT_ID_KEY);
        console.log('Client ID cleared.');
    } catch (error) {
        console.error('Error clearing client ID:', error);
    }
};