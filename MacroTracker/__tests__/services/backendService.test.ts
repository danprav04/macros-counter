// __tests__/services/backendService.test.ts
import { Alert } from 'react-native';
import { fetchBackend, BackendError, getUserStatus } from '../../src/services/backendService';
import * as authService from '../../src/services/authService';
import * as clientIDService from '../../src/services/clientIDService';
import { t } from '../../src/localization/i18n';

// Mock dependencies
jest.mock('react-native', () => ({
    Alert: { alert: jest.fn() },
    Platform: { OS: 'ios' },
}));
jest.mock('../../src/services/authService');
jest.mock('../../src/services/clientIDService');

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedClientIDService = clientIDService as jest.Mocked<typeof clientIDService>;

// Mock fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('backendService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockedClientIDService.getClientId.mockResolvedValue('mock-uuid');
    mockedAuthService.getAuthToken.mockResolvedValue({
        access_token: 'valid-access-token',
        refresh_token: 'valid-refresh-token',
        token_type: 'bearer',
    });
  });

  describe('General fetchBackend behavior', () => {
    it('should successfully fetch data with valid tokens', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ coins: 100 }),
        });
        const result = await getUserStatus();
        expect(result).toEqual({ coins: 100 });
        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer valid-access-token',
                    'X-Client-ID': 'mock-uuid',
                }),
            })
        );
    });

    it('should handle a 204 No Content response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 204,
            json: () => Promise.resolve(null), // The body would be empty
        });
        const result = await fetchBackend('/some-endpoint');
        expect(result).toBeNull();
    });

    it('should throw a BackendError for non-ok responses with JSON details', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ detail: 'Invalid input' }),
        });
        await expect(getUserStatus()).rejects.toThrow(new BackendError('Invalid input', 400));
    });

    it('should handle non-JSON error responses gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error('Invalid JSON')), // Simulate parsing failure
        });
        const expectedErrorMessage = t('backendService.errorRequestFailedParse', { status: 500 });
        await expect(getUserStatus()).rejects.toThrow(new BackendError(expectedErrorMessage, 500));
    });

    it('should throw a BackendError for network failures', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
        const expectedErrorMessage = t('backendService.errorNetwork') + t('backendService.errorNetworkConnection');
        await expect(getUserStatus()).rejects.toThrow(new BackendError(expectedErrorMessage, 0));
    });
  });

  describe('Token Refresh Logic', () => {
    it('should refresh token on 401 and retry the request', async () => {
        // First call fails with 401
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ detail: 'Token expired' }),
        });
        // Second call (after refresh) succeeds
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ coins: 100 }),
        });

        // Mock the token refresh service
        mockedAuthService.refreshAuthToken.mockResolvedValue({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            token_type: 'bearer',
        });

        const result = await getUserStatus();
        expect(result).toEqual({ coins: 100 });
        expect(mockedAuthService.refreshAuthToken).toHaveBeenCalledWith('valid-refresh-token');
        expect(mockedAuthService.setAuthToken).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'new-access-token' }));
        expect(mockFetch).toHaveBeenCalledTimes(2);
        // The second call should use the new token
        expect(mockFetch.mock.calls[1][1]?.headers).toEqual(
            expect.objectContaining({ 'Authorization': 'Bearer new-access-token' })
        );
    });

    it('should trigger logout if refresh token fails', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ detail: 'Token expired' }),
        });
        mockedAuthService.refreshAuthToken.mockResolvedValue(null);
        const expectedError = t('backendService.errorAuthFailed');
        await expect(getUserStatus()).rejects.toThrow(expectedError);
        expect(authService.triggerLogout).toHaveBeenCalled();
    });

    it('should trigger logout if there is no refresh token to begin with', async () => {
        mockedAuthService.getAuthToken.mockResolvedValue({
            access_token: 'valid-access-token',
            refresh_token: '', // No refresh token
            token_type: 'bearer',
        });
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ detail: 'Token expired' }),
        });
        const expectedError = t('backendService.errorAuthFailed');
        await expect(getUserStatus()).rejects.toThrow(expectedError);
        expect(authService.triggerLogout).toHaveBeenCalled();
    });
  });
});