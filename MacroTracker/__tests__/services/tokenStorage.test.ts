// __tests__/services/tokenStorage.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { saveToken, getToken, deleteToken } from '../../src/services/tokenStorage';
import { Token } from '../../src/types/token';

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
  beforeEach(() => {
    // Reset mocks before each test
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    (SecureStore.getItemAsync as jest.Mock).mockClear();
    (SecureStore.deleteItemAsync as jest.Mock).mockClear();
  });

  describe('when in Expo Go / development mode', () => {
    beforeEach(() => {
      // Mock Constants for dev environment
      jest.doMock('expo-constants', () => ({
        expoConfig: { appOwnership: 'expo' },
      }));
    });

    afterEach(() => {
      jest.unmock('expo-constants');
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