// __tests__/services/backendService.test.ts

import { fetchBackend } from '../../src/services/backendService';
import * as authService from '../../src/services/authService';
import { getClientId } from '../../src/services/clientIDService';

// Mock dependencies
jest.mock('../../src/services/authService');
jest.mock('../../src/services/clientIDService');

const mockedGetAuthToken = authService.getAuthToken as jest.Mock;
const mockedRefreshAuthToken = authService.refreshAuthToken as jest.Mock;
const mockedSetAuthToken = authService.setAuthToken as jest.Mock;
const mockedGetClientId = getClientId as jest.Mock;
const mockedTriggerLogout = authService.triggerLogout as jest.Mock;

// Global mock for fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('backendService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetClientId.mockResolvedValue('mock-uuid');
  });

  describe('Token Refresh Logic', () => {
    it('should refresh token on 401 and retry the request', async () => {
      // First call fails with 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Token has expired' }),
      });
      // Second call (after refresh) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      });

      // Mock getAuthToken to provide the old token on the first call, and the new one on the retry
      mockedGetAuthToken
        .mockResolvedValueOnce({ access_token: 'valid-access-token', refresh_token: 'valid-refresh-token', token_type: 'bearer' })
        .mockResolvedValueOnce({ access_token: 'new-access-token', refresh_token: 'new-refresh-token', token_type: 'bearer' });
      
      mockedRefreshAuthToken.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      });

      const response = await fetchBackend('/test-endpoint');

      expect(response).toEqual({ data: 'success' });
      expect(authService.refreshAuthToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(authService.setAuthToken).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'new-access-token' }));
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // FIX: The headers for the second call should now include the NEW token.
      // Use toMatchObject to ignore other default headers like Content-Type.
      const secondCallHeaders = (mockFetch.mock.calls[1][1] as RequestInit).headers;
      expect(secondCallHeaders).toMatchObject({
        'Authorization': 'Bearer new-access-token'
      });
    });

    it('should trigger logout if refresh token is invalid', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Token has expired' }),
        });
  
        mockedGetAuthToken.mockResolvedValue({ access_token: 'expired-token', refresh_token: 'invalid-refresh', token_type: 'bearer' });
        mockedRefreshAuthToken.mockResolvedValue(null); // Simulate refresh failure
  
        await expect(fetchBackend('/test-endpoint')).rejects.toThrow('Authentication with the server failed.');
  
        expect(mockedTriggerLogout).toHaveBeenCalled();
    });
  });
});