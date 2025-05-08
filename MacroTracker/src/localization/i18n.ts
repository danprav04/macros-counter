// src/localization/i18n.ts
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from './languages/en.json';
import ru from './languages/ru.json';
import he from './languages/he.json';
import { Platform, I18nManager } from 'react-native';

const translations = {
  en,
  ru,
  he,
};

const i18n = new I18n(translations);

// Set initial locale
export const setLocale = (locale: string) => {
  const languageTag = locale.split('-')[0]; // 'en', 'ru', 'he'
  i18n.locale = languageTag;
  i18n.defaultLocale = 'en'; // Fallback language

  // Handle RTL layout for Hebrew
  const isRTL = languageTag === 'he';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    // For standalone apps, you might need to prompt user to restart or use Updates.reloadAsync()
    // For Expo Go, changes might not reflect immediately without a manual reload of the app.
    console.log(`RTL forced to: ${isRTL} for locale: ${languageTag}. App restart may be needed for full effect.`);
  }
};

// Get device's locale
const deviceLocale = Localization.getLocales()?.[0]?.languageTag || 'en-US';
setLocale(deviceLocale); // Initialize with device locale

export const t = (scope: keyof typeof en, options?: any) => {
  return i18n.t(scope, { ...options, locale: i18n.locale });
};

// Function to get date-fns locale
export const getDateFnLocale = async () => {
  const currentLocale = i18n.locale.split('-')[0];
  switch (currentLocale) {
    case 'ru':
      return (await import('date-fns/locale/ru')).ru;
    case 'he':
      return (await import('date-fns/locale/he')).he;
    case 'en':
    default:
      return (await import('date-fns/locale/en-US')).enUS;
  }
};

export default i18n;