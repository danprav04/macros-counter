// __tests__/services/tokenStorage.test.ts

import { saveToken, getToken, deleteToken } from '../../src/services/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Token } from '../../src/types/token';
import Constants from 'expo-constants';

// Mock the modules we'll be checking
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockToken: Token = {
  access_token: 'abc',
  refresh_token: 'xyz',
  token_type: 'bearer',
};
const mockTokenJson = JSON.stringify(mockToken);

describe('tokenStorage', () => {
  let constantsSpy: jest.SpyInstance;

  afterEach(() => {
    jest.clearAllMocks();
    // Restore the spy after each test
    if (constantsSpy) {
      constantsSpy.mockRestore();
    }
  });

  describe('when in a standalone app', () => {
    beforeEach(() => {
      // Mock the implementation for this specific context
      constantsSpy = jest.spyOn(Constants, 'expoConfig', 'get').mockReturnValue({
        ...(Constants.expoConfig as any),
        appOwnership: 'standalone',
      });
    });

    it('should use SecureStore to save a token', async () => {
      await saveToken(mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), mockTokenJson);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use SecureStore to get a token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockTokenJson);
      const token = await getToken();
      expect(token).toEqual(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should use SecureStore to delete a token', async () => {
      await deleteToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
    
    it('should return null and clear corrupted token from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{invalid-json}');
      const token = await getToken();
      expect(token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('when in Expo Go', () => {
    beforeEach(() => {
      // Mock the implementation for this specific context
      constantsSpy = jest.spyOn(Constants, 'expoConfig', 'get').mockReturnValue({
        ...(Constants.expoConfig as any),
        appOwnership: 'expo',
      });
    });

    it('should use AsyncStorage to save a token', async () => {
      await saveToken(mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.any(String), mockTokenJson);
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should use AsyncStorage to get a token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockTokenJson);
      const token = await getToken();
      expect(token).toEqual(mockToken);
      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('should use AsyncStorage to delete a token', async () => {
      await deleteToken();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('should return null and clear corrupted token from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{invalid-json}');
      const token = await getToken();
      expect(token).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });
});