// __tests__/services/clientIDService.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getClientId, clearClientId } from 'services/clientIDService';
import uuid from 'react-native-uuid';

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'new-uuid-generated'),
}));

const mockedUuidV4 = uuid.v4 as jest.Mock;

describe('clientIDService', () => {

  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
    mockedUuidV4.mockClear();
    // Must clear the in-memory cache for tests to be isolated
    clearClientId();
  });

  it('should generate and save a new client ID if none exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const clientId = await getClientId();

    expect(clientId).toBe('new-uuid-generated');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@MacroTracker:clientId');
    expect(uuid.v4).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@MacroTracker:clientId', 'new-uuid-generated');
  });

  it('should retrieve an existing client ID from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('existing-uuid');

    const clientId = await getClientId();

    expect(clientId).toBe('existing-uuid');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@MacroTracker:clientId');
    expect(uuid.v4).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should use the in-memory cache on subsequent calls', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('existing-uuid');
    
    // First call, populates cache
    await getClientId();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    
    // Second call, should hit cache
    const clientId = await getClientId();
    expect(clientId).toBe('existing-uuid');
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should generate a fallback ID if AsyncStorage.getItem fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
    
    const clientId = await getClientId();
    
    expect(clientId).toBe('new-uuid-generated');
    expect(uuid.v4).toHaveBeenCalled();
  });

  it('clearClientId should remove the ID from storage', async () => {
    await clearClientId();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@MacroTracker:clientId');
  });
});