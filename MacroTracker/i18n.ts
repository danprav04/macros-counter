import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native'; // Import I18nManager

// Import translation files
import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';
import he from './locales/he/translation.json';

// Import language storage functions (assuming they exist - we'll add them)
import { loadLanguage, saveLanguage } from './services/storageService';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  he: { translation: he },
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const, // Use 'as const' for literal type
  async: true, // We need async for AsyncStorage
  detect: async (callback: (lang: string) => void) => {
    try {
      // 1. Try to get language from AsyncStorage
      const savedLanguage = await loadLanguage();
      if (savedLanguage) {
        console.log('i18n: Loaded language from storage:', savedLanguage);
        callback(savedLanguage);
        return;
      }

      // 2. Get device locale
      const locales = Localization.getLocales();
      const deviceLanguage = locales?.[0]?.languageCode; // e.g., 'en', 'ru', 'he'

      if (deviceLanguage && resources[deviceLanguage as keyof typeof resources]) {
        console.log('i18n: Detected device language:', deviceLanguage);
        callback(deviceLanguage);
        return;
      }

      // 3. Fallback to English
      console.log('i18n: Falling back to English');
      callback('en');
    } catch (error) {
      console.error('i18n: Error detecting language:', error);
      callback('en'); // Fallback on error
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      console.log('i18n: Caching user language:', language);
      await saveLanguage(language);
      // Handle RTL switching if necessary (though direct manipulation is tricky)
      // const isRTL = language === 'he';
      // if (I18nManager.isRTL !== isRTL) {
      //   I18nManager.forceRTL(isRTL);
      //   // IMPORTANT: RNRestart.Restart(); // Requires react-native-restart, usually needs user confirmation
      //   console.warn("RTL setting mismatch. App restart might be needed for full layout changes.");
      // }
    } catch (error) {
      console.error('i18n: Error caching language:', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources,
    // lng: 'en', // Let detector handle initial language
    fallbackLng: 'en',
    compatibilityJSON: 'v3', // For Expo SDK 4 compatibility+
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: false, // Recommended for React Native
    },
  });

export default i18n;