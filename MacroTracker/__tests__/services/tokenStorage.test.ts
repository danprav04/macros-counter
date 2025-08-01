// __tests__/services/tokenStorage.test.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, getToken, deleteToken } from '../../src/services/tokenStorage';
import { Token } from '../../src/types/token';
import Constants from 'expo-constants';

// Mock the modules
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

const mockToken: Token = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
};
const tokenJson = JSON.stringify(mockToken);

describe('tokenStorage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when in a standalone app (production)', () => {
    beforeAll(() => {
      // Re-mock Constants specifically for this describe block
      jest.doMock('expo-constants', () => ({
        ...Constants,
        expoConfig: {
          ...Constants.expoConfig,
          appOwnership: 'standalone',
        },
      }));
    });

    it('should use SecureStore to save a token', async () => {
      await saveToken(mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), tokenJson);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use SecureStore to get a token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(tokenJson);
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
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('corrupted-json');
      const token = await getToken();
      expect(token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('when in Expo Go or development client', () => {
    beforeAll(() => {
      // Re-mock Constants for this describe block
      jest.doMock('expo-constants', () => ({
        ...Constants,
        expoConfig: {
          ...Constants.expoConfig,
          appOwnership: 'expo', // or 'guest'
        },
      }));
    });

    it('should use AsyncStorage to save a token', async () => {
      await saveToken(mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.any(String), tokenJson);
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should use AsyncStorage to get a token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(tokenJson);
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
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted-json');
      const token = await getToken();
      expect(token).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });
});