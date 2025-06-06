// src/utils/iconUtils.ts
import { findBestIcon } from './foodIconMatcher';
import { detectLanguageFromText } from './languageUtils'; // Import new utility
import { LanguageCode } from '../types/settings';

const syncMemoryCache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 300;

/**
 * Synchronously gets the icon identifier (e.g., emoji) for a food item.
 * It first detects the language of the food name, then uses an in-memory cache.
 * Relies on `findBestIcon` which uses localized tags based on the detected language.
 *
 * @param foodName The name of the food item.
 * @returns An icon string (emoji) or null if not found or an error occurred.
 */
export const getFoodIconUrl = (foodName: string): string | null => {
  if (!foodName || foodName.trim() === '') {
    return null;
  }

  const detectedLocale = detectLanguageFromText(foodName);
  const normalizedNameForCache = foodName.toLowerCase().trim();
  const cacheKey = `${detectedLocale}_${normalizedNameForCache}`;

  if (syncMemoryCache.has(cacheKey)) {
    const cachedIcon = syncMemoryCache.get(cacheKey)!;
    // console.log(`[getFoodIconUrl] CACHE HIT for key "${cacheKey}". Food: "${foodName}", Detected Locale: ${detectedLocale}, Icon: ${cachedIcon}`);
    return cachedIcon;
  }
  // console.log(`[getFoodIconUrl] CACHE MISS for key "${cacheKey}". Food: "${foodName}", Detected Locale: ${detectedLocale}. Calling findBestIcon.`);

  const iconIdentifier = findBestIcon(foodName, detectedLocale);

  if (syncMemoryCache.size >= MAX_CACHE_SIZE) {
    const keys = Array.from(syncMemoryCache.keys());
    for (let i = 0; i < Math.floor(MAX_CACHE_SIZE / 4); i++) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        const keyToRemove = keys.splice(randomIndex, 1)[0];
        if(keyToRemove) syncMemoryCache.delete(keyToRemove);
    }
    // console.log(`[getFoodIconUrl] Food icon memory cache partially cleared. New size: ${syncMemoryCache.size}`);
  }
  syncMemoryCache.set(cacheKey, iconIdentifier);
  // console.log(`[getFoodIconUrl] Cached new icon for key "${cacheKey}". Food: "${foodName}", Icon: ${iconIdentifier}`);

  return iconIdentifier;
};

export const clearLocalIconCache = (): void => {
  syncMemoryCache.clear();
  console.log("[clearLocalIconCache] In-memory food icon cache CLEARED.");
};

export const logLocalIconCacheSize = (): void => {
  console.log(`[logLocalIconCacheSize] In-memory food icon cache size: ${syncMemoryCache.size}`);
};