// src/utils/iconUtils.ts
import { findBestIcon } from './foodIconMatcher';

// In-memory cache for synchronous lookups.
// Key: `${locale}_${normalizedFoodName}`
// Value: `string | null` (the icon identifier or null)
const syncMemoryCache = new Map<string, string | null>();

const MAX_CACHE_SIZE = 200; // Limit cache size to prevent memory bloat

/**
 * Synchronously gets the icon identifier (e.g., emoji) for a food item.
 * Uses an in-memory cache for repeated lookups.
 *
 * @param foodName The name of the food item.
 * @param locale The desired locale for the icon search (e.g., 'en', 'ru').
 * @returns An icon string (emoji) or null if not found or an error occurred.
 */
export const getFoodIconUrl = (foodName: string, locale: string = 'en'): string | null => {
  if (!foodName || foodName.trim() === '') {
    // console.warn("getFoodIconUrl (sync) called with empty foodName.");
    return null;
  }

  const normalizedName = foodName.toLowerCase().trim();
  const cacheKey = `${locale}_${normalizedName}`;

  // 1. Check Memory Cache
  if (syncMemoryCache.has(cacheKey)) {
    return syncMemoryCache.get(cacheKey)!;
  }

  // 2. Find icon using the matcher
  const iconIdentifier = findBestIcon(normalizedName, locale);

  // 3. Update Memory Cache
  // Simple eviction strategy: if cache is too big, clear it.
  // More sophisticated strategies like LRU could be used if needed.
  if (syncMemoryCache.size >= MAX_CACHE_SIZE) {
    syncMemoryCache.clear();
    // console.log("Food icon memory cache cleared due to size limit.");
  }
  syncMemoryCache.set(cacheKey, iconIdentifier);

  return iconIdentifier;
};

/**
 * Clears the in-memory icon cache.
 */
export const clearLocalIconCache = (): void => {
  syncMemoryCache.clear();
  console.log("In-memory food icon cache cleared.");
};

/**
 * Logs the current size of the in-memory icon cache.
 */
export const logLocalIconCacheSize = (): void => {
  console.log(`In-memory food icon cache size: ${syncMemoryCache.size}`);
};
