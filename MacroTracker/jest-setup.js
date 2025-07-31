// jest-setup.js

// This mock MUST BE at the top to be hoisted by Jest. It resolves a module
// not found error in jest-expo@51 with Expo SDK 52. The jest-expo preset
// attempts to require a file that no longer exists in newer Expo versions.
// By mocking it here and loading this file via `setupFiles` in jest.config.js,
// we ensure this mock is registered before the preset's scripts are executed.
jest.mock('expo-modules-core/build/Refs', () => ({}));

import '@testing-library/jest-native/extend-expect';
import 'react-native-get-random-values';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

// --- ADDED MOCK ---
// Mock expo-font to prevent errors from @expo/vector-icons in tests
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
}));
// --- END ADDED MOCK ---

// Mock Expo Modules
jest.mock('expo-constants', () => ({
  ...jest.requireActual('expo-constants'),
  expoConfig: {
    extra: {
      env: {
        BACKEND_URL_DEVELOPMENT: 'http://mock-dev-url.com',
        BACKEND_URL_PRODUCTION: 'http://mock-prod-url.com',
      },
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));