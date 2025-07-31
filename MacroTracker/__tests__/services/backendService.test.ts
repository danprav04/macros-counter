// __tests__/services/backendService.test.ts
import { Alert } from 'react-native';
import {
  getUserStatus,
  getMacrosForRecipe,
  addCoinsToUser,
  BackendError,
} from 'services/backendService';
import * as authService from 'services/authService';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.spyOn(Alert, 'alert');

// Mock authService functions
jest.mock('services/authService', () => ({
  ...jest.requireActual('services/authService'), // import and retain default behavior
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
  refreshAuthToken: jest.fn(),
  triggerLogout: jest.fn(),
}));

const mockedGetAuthToken = authService.getAuthToken as jest.Mock;
const mockedRefreshAuthToken = authService.refreshAuthToken as jest.Mock;
const mockedTriggerLogout = authService.triggerLogout as jest.Mock;

describe('backendService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockedGetAuthToken.mockResolvedValue({
      access_token: 'valid-access-token',
      refresh_token: 'valid-refresh-token',
    });
  });

  describe('General fetchBackend behavior', () => {
    it('should successfully fetch data with auth token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const data = await getUserStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        })
      );
      expect(data).toEqual({ status: 'ok' });
    });

    it('should handle 204 No Content responses', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 204,
            headers: new Headers(),
        });

        const data = await getMacrosForRecipe("test", "test");
        expect(data).toBeNull();
    });

    it('should handle non-JSON error responses gracefully', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            headers: new Headers({ 'Content-Type': 'text/html' }),
            text: () => Promise.resolve('<h1>Server Error</h1>'),
        });

        await expect(getUserStatus()).rejects.toThrow(new BackendError('The server returned an error (Status 500).', 500));
    });
  });

  describe('Token Refresh Logic', () => {
    it('should refresh token on 401 and retry the request', async () => {
      // First call fails with 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Token has expired' }),
      });
      
      // Assume refresh token is successful
      mockedRefreshAuthToken.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
      
      // Second call (the retry) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve({ coins: 10 }),
      });
      
      const result = await getUserStatus();
      
      expect(mockedRefreshAuthToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(authService.setAuthToken).toHaveBeenCalledWith({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
      // The fetch should be called twice
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // The second call should use the new token
      expect(mockFetch).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
              headers: expect.objectContaining({
                  Authorization: 'Bearer new-access-token',
              })
          })
      );
      expect(result).toEqual({ coins: 10 });
    });

    it('should trigger logout if refresh token fails', async () => {
      // First call fails with 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Token has expired' }),
      });
      
      // Assume refresh token fails
      mockedRefreshAuthToken.mockResolvedValue(null);
      
      await expect(getUserStatus()).rejects.toThrow('Session expired. Please log in again.');
      
      expect(mockedTriggerLogout).toHaveBeenCalled();
    });

     it('should trigger logout if there is no refresh token to begin with', async () => {
        mockedGetAuthToken.mockResolvedValue({ access_token: 'valid', refresh_token: null });
        
        mockFetch.mockResolvedValueOnce({
            ok: false, status: 401, headers: new Headers(),
            json: () => Promise.resolve({ detail: 'Token has expired' }),
        });
        
        await expect(getUserStatus()).rejects.toThrow('Refresh token not found.');
        expect(mockedTriggerLogout).toHaveBeenCalled();
    });
  });

  describe('Specific API endpoints', () => {
      it('addCoinsToUser should throw an error for non-positive amounts', async () => {
          await expect(addCoinsToUser(0)).rejects.toThrow('Amount must be positive');
          await expect(addCoinsToUser(-10)).rejects.toThrow('Amount must be positive');
          expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle specific error messages from backend', async () => {
          mockFetch.mockResolvedValue({
              ok: false, status: 402, headers: new Headers({'Content-Type': 'application/json'}),
              json: () => Promise.resolve({ detail: 'Not enough coins' })
          });
          // Note: The service translates 402 to a specific message, ignoring the detail
          await expect(getUserStatus()).rejects.toThrow("You don't have enough AI coins for this action. More will be available soon!");
      });
  });
});