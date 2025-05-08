// src/localization/i18n.ts
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from './languages/en.json';
import ru from './languages/ru.json';
import he from './languages/he.json';
import { Platform, I18nManager } from 'react-native';
// Import specific date-fns locales statically
import { enUS, ru as ruLocale, he as heLocale } from 'date-fns/locale';


const translations = {
  en,
  ru,
  he,
};

const i18n = new I18n(translations);

export const setLocale = (locale: string) => {
  const languageTag = locale.split('-')[0];
  i18n.locale = languageTag;
  i18n.defaultLocale = 'en';

  const isRTL = languageTag === 'he';
  // Only force RTL if it's different from the current manager state
  // This check is crucial to avoid unnecessary reloads or issues in Expo Go.
  if (Platform.OS !== 'web' && I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    // Forcing RTL often requires an app reload to take full effect,
    // especially for layout changes.
    // In a standalone app, you'd use Updates.reloadAsync().
    // In Expo Go, this change might not be immediate without a manual reload.
    console.log(`RTL forced to: ${isRTL} for locale: ${languageTag}. App restart/reload may be needed for full layout update.`);
  } else if (Platform.OS === 'web') {
      // For web, you might need to manipulate the document direction
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }
};

const deviceLocale = Localization.getLocales()?.[0]?.languageTag || 'en-US';
setLocale(deviceLocale);

export const t = (scope: keyof typeof en, options?: any) => {
  return i18n.t(scope, { ...options, locale: i18n.locale });
};

export const getDateFnLocale = async () => { // Keep async for potential future dynamic loads if needed
  const currentLocale = i18n.locale.split('-')[0];
  switch (currentLocale) {
    case 'ru':
      return ruLocale;
    case 'he':
      return heLocale;
    case 'en':
    default:
      return enUS;
  }
};

export default i18n;