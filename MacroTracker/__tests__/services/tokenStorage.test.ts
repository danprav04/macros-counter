// __tests__/services/tokenStorage.test.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { saveToken, getToken, deleteToken } from '../../src/services/tokenStorage';
import { Token } from '../../src/types/token';

// Mock the storage modules
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockToken: Token = {
  access_token: 'abc',
  refresh_token: 'xyz',
  token_type: 'bearer',
};
const mockTokenJson = JSON.stringify(mockToken);

describe('tokenStorage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when in a standalone app', () => {
    // This suite relies on the global mock from jest-setup.ts where appOwnership is 'standalone'
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
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{invalid-json');
      const token = await getToken();
      expect(token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('when in Expo Go', () => {
    let originalAppOwnership: string | undefined;

    beforeAll(() => {
      // Safely access and store the original value from the global mock
      if (Constants.expoConfig) {
        originalAppOwnership = (Constants.expoConfig as any).appOwnership;
        // Mutate the mock object for this specific test suite by casting to 'any'
        (Constants.expoConfig as any).appOwnership = 'expo';
      }
    });

    afterAll(() => {
      // Restore the original value to avoid side effects in other tests
      if (Constants.expoConfig) {
        (Constants.expoConfig as any).appOwnership = originalAppOwnership;
      }
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
  });
});