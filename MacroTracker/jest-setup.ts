// jest-setup.ts

// This mock MUST BE at the top to be hoisted by Jest. It resolves a module
// not found error in jest-expo@51 with Expo SDK 52. The jest-expo preset
// attempts to require a file that no longer exists in newer Expo versions.
// By mocking it here and loading this file via `setupFiles` in jest.config.js,
// we ensure this mock is registered before the preset's scripts are executed.
jest.mock('expo-modules-core/build/Refs', () => ({}));

// Mock react-navigation hooks globally.
// This prevents "TypeError: Cannot redefine property: useNavigation"
// and provides a consistent mock navigator for all tests.
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: jest.fn(),
            setParams: jest.fn(),
            addListener: jest.fn(() => jest.fn()), // Prevents errors in components that listen to navigation events
            removeListener: jest.fn(),
        }),
        useRoute: () => ({
            params: {},
        }),
    };
});

import '@testing-library/jest-native/extend-expect';

// --- ADDED MOCK for Platform and I18nManager ---
// Mocks react-native's native modules that are not available in Jest's environment.
// This is crucial for components and modules that rely on device-specific info like OS or RTL layout.
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'android',
    select: (specs: Record<string, any>) => specs.android,
}));

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => ({
    isRTL: false,
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
}));
// --- END ADDED MOCK ---

import 'react-native-get-random-values';

// Mock react-native-uuid and uuid to ensure consistent ID generation in tests
jest.mock('react-native-uuid', () => ({
  v4: () => 'mock-uuid',
}));
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));


// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

// --- CORRECTED MOCK ---
// Mock expo-font without `requireActual` to prevent native code execution.
// This resolves the crash when rendering @rneui/themed Icons.
jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
  // Add any other functions that might be called from expo-font if needed
}));
// --- END CORRECTED MOCK ---


// Mock Expo Modules to prevent console warnings
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      env: {
        BACKEND_URL_DEVELOPMENT: 'http://mock-dev-url.com',
        BACKEND_URL_PRODUCTION: 'http://mock-prod-url.com',
      },
    },
    // Mock appOwnership to control tokenStorage behavior in tests
    appOwnership: 'standalone',
  },
  // Add a more complete manifest mock to prevent crashes in dependent libraries like expo-asset
  manifest: {
    ...require('expo-constants/package.json'), // Spread some defaults
    name: 'test-app',
    slug: 'test-app',
    version: '1.0.0',
    assetBundlePatterns: ['**/*'],
  },
  manifest2: {}, // For newer SDK versions that might look here
}));

jest.mock('expo-localization', () => ({
    getLocales: () => [{
        languageCode: 'en',
        languageTag: 'en-US',
        countryCode: 'US',
        isRTL: false,
    }],
    getCalendars: () => [{
        timeZone: 'UTC',
    }],
}));


jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// --- ADDED MOCKS for Expo modules causing crashes ---
jest.mock('expo-asset', () => ({
    ...jest.requireActual('expo-asset'),
    Asset: {
        fromModule: jest.fn(() => ({
            downloadAsync: jest.fn(),
            uri: 'test-uri',
        })),
    },
}));

jest.mock('expo-file-system', () => ({
    readAsStringAsync: jest.fn(async (uri, options) => {
      if (options && options.encoding === 'base64') {
        return 'mock-base64-string';
      }
      return 'mock file content';
    }),
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    documentDirectory: 'file:///mock-dir/',
    EncodingType: {
      Base64: 'base64',
      UTF8: 'utf8',
    },
  }));

jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn(async (uri, actions, options) => {
        return {
            uri: `manipulated-${uri}`,
            width: 50,
            height: 50,
            base64: 'manipulated-base64',
        };
    }),
    SaveFormat: {
        JPEG: 'jpeg',
        PNG: 'png',
    },
}));
// --- END ADDED MOCKS ---