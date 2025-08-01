// jest-setup.ts

// This mock MUST BE at the top to be hoisted by Jest. It resolves a module
// not found error in jest-expo@51 with Expo SDK 52.
jest.mock('expo-modules-core/build/Refs', () => ({}));

// Mock react-navigation hooks globally.
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: jest.fn(),
            setParams: jest.fn(),
            addListener: jest.fn(() => jest.fn()),
            removeListener: jest.fn(),
        }),
        useRoute: () => ({
            params: {},
        }),
    };
});

// --- FIXES FOR TEST FAILURES ---

// 1. Mock react-native-webview to prevent native module errors in component tests
jest.mock('react-native-webview', () => {
    const { View } = require('react-native');
    return { WebView: View };
});

// 2. Mock missing native functionality from react-native itself.
// This prevents crashes related to 'SettingsManager', 'Platform', and 'I18nManager'.
jest.mock('react-native', () => {
    const rn = jest.requireActual('react-native');

    // Mock for 'SettingsManager' which requires getConstants()
    rn.NativeModules.SettingsManager = {
        settings: {},
        getConstants: () => ({}),
    };

    // Mocks for 'Platform.OS' and 'I18nManager.isRTL' used in i18n
    rn.Platform.OS = 'ios';
    rn.I18nManager.isRTL = false;
    
    return rn;
});

// --- END FIXES ---

import '@testing-library/jest-native/extend-expect';
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

// Mock expo-font without `requireActual` to prevent native code execution.
jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
}));


// Mock Expo Modules to prevent console warnings
jest.mock('expo-constants', () => {
    const constants = jest.requireActual('expo-constants');
    return {
        ...constants,
        expoConfig: {
            ...constants.expoConfig,
            extra: {
                env: {
                    BACKEND_URL_DEVELOPMENT: 'http://mock-dev-url.com',
                    BACKEND_URL_PRODUCTION: 'http://mock-prod-url.com',
                },
            },
            // 3. FIX: Add scheme for expo-linking
            scheme: 'macrosvisionai',
        },
        // 3. FIX: Add linking object for expo-linking
        linking: {
            hostname: 'expo.dev',
            path: '',
            schemes: ['macrosvisionai', 'exp'],
        },
        // appOwnership is now controlled by the specific test file that needs it.
        // manifest and manifest2 are kept for compatibility.
        manifest: {
            ...require('expo-constants/package.json'),
            name: 'test-app',
            slug: 'test-app',
            version: '1.0.0',
            assetBundlePatterns: ['**/*'],
        },
        manifest2: {},
    };
});

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