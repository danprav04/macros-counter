// __tests__/services/authService.test.ts
import { Alert } from 'react-native';
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  getApiUrl,
  setLogoutListener,
  triggerLogout,
  refreshAuthToken,
} from 'services/authService';
import * as tokenStorage from 'services/tokenStorage';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.spyOn(Alert, 'alert');
jest.spyOn(tokenStorage, 'getToken');
jest.spyOn(tokenStorage, 'saveToken');
jest.spyOn(tokenStorage, 'deleteToken');

const API_URL = getApiUrl();
const AUTH_URL = `${API_URL}/auth`;

describe('authService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    (Alert.alert as jest.Mock).mockClear();
    (tokenStorage.deleteToken as jest.Mock).mockClear();
  });

  describe('registerUser', () => {
    it('should successfully register a user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'User created' }),
      });
      const result = await registerUser('test@test.com', 'password123');
      expect(result.message).toBe('User created');
      expect(mockFetch).toHaveBeenCalledWith(`${AUTH_URL}/register`, expect.any(Object));
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Email already exists' }),
      });
      await expect(registerUser('test@test.com', 'password123')).rejects.toThrow();
      expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', 'Email already exists');
    });
  });

  describe('loginUser', () => {
    it('should successfully log in a user', async () => {
        const mockToken = { access_token: '123', refresh_token: '456' };
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockToken),
        });
        const result = await loginUser('test@test.com', 'password123');
        expect(result).toEqual(mockToken);
        expect(mockFetch).toHaveBeenCalledWith(`${AUTH_URL}/login`, expect.any(Object));
    });

    it('should handle login failure', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ detail: 'Incorrect username or password' }),
        });
        await expect(loginUser('test@test.com', 'wrongpass')).rejects.toThrow();
        expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Incorrect username or password');
    });
  });

  describe('requestPasswordReset', () => {
    it('should successfully request a password reset', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Email sent' }),
      });
      const result = await requestPasswordReset('test@test.com');
      expect(result.message).toBe('Email sent');
      expect(mockFetch).toHaveBeenCalledWith(`${AUTH_URL}/request-password-reset`, expect.any(Object));
    });
  });
  
  describe('refreshAuthToken', () => {
      it('should return new tokens on successful refresh', async () => {
          const newTokens = { access_token: 'new_access', refresh_token: 'new_refresh', token_type: 'bearer' };
          mockFetch.mockResolvedValue({
              ok: true,
              json: () => Promise.resolve(newTokens),
          });
          const result = await refreshAuthToken('old_refresh');
          expect(result).toEqual(newTokens);
          expect(mockFetch).toHaveBeenCalledWith(`${AUTH_URL}/refresh-token`, expect.any(Object));
      });
      
      it('should return null on failed refresh', async () => {
          mockFetch.mockResolvedValue({
              ok: false,
              json: () => Promise.resolve({ detail: 'Invalid refresh token' }),
          });
          const result = await refreshAuthToken('invalid_refresh');
          expect(result).toBeNull();
      });
  });

  describe('logoutUser', () => {
    it('should call logout endpoint and delete token', async () => {
        (tokenStorage.getToken as jest.Mock).mockResolvedValue({ access_token: '123' });
        mockFetch.mockResolvedValue({ ok: true, status: 204 });

        await logoutUser();

        expect(mockFetch).toHaveBeenCalledWith(`${AUTH_URL}/logout`, expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Authorization': 'Bearer 123' })
        }));
        expect(tokenStorage.deleteToken).toHaveBeenCalled();
    });
    
    it('should delete token even if logout endpoint fails', async () => {
        (tokenStorage.getToken as jest.Mock).mockResolvedValue({ access_token: '123' });
        mockFetch.mockRejectedValue(new Error('Network error'));
        
        await logoutUser();
        
        expect(tokenStorage.deleteToken).toHaveBeenCalled();
    });

    it('should just delete token if no auth token is present', async () => {
        (tokenStorage.getToken as jest.Mock).mockResolvedValue(null);
        await logoutUser();
        expect(mockFetch).not.toHaveBeenCalled();
        expect(tokenStorage.deleteToken).toHaveBeenCalled();
    });
  });

  describe('Logout Listener', () => {
      it('should trigger the registered logout listener', () => {
          const listener = jest.fn();
          setLogoutListener(listener);
          triggerLogout();
          expect(listener).toHaveBeenCalled();
          expect(tokenStorage.deleteToken).toHaveBeenCalled();
      });
  });
});