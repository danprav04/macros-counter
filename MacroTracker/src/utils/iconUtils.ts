// src/utils/iconUtils.ts
import { findBestIcon } from './foodIconMatcher';
import { detectLanguageFromText } from './languageUtils'; // Import new utility
import { LanguageCode } from '../types/settings';

const syncMemoryCache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 300;

/**
 * Synchronously gets the icon identifier (e.g., emoji) for a food item.
 * It uses an in-memory cache to quickly return results for previously seen items.
 * If not cached, it detects the language of the food name and then finds the best
 * icon using localized tags.
 *
 * @param foodName The name of the food item.
 * @returns An icon string (emoji) or null if not found or an error occurred.
 */
export const getFoodIconUrl = (foodName: string): string | null => {
  if (!foodName || foodName.trim() === '') {
    return null;
  }

  // Use a language-agnostic key for caching, assuming one food name string
  // consistently maps to one icon. This avoids re-detecting language for cached items.
  const normalizedNameForCache = foodName.toLowerCase().trim();

  if (syncMemoryCache.has(normalizedNameForCache)) {
    return syncMemoryCache.get(normalizedNameForCache)!;
  }

  // --- Cache Miss ---
  // Now perform the more expensive operations
  const detectedLocale = detectLanguageFromText(foodName);
  const iconIdentifier = findBestIcon(foodName, detectedLocale);

  // Manage cache size before adding the new item
  if (syncMemoryCache.size >= MAX_CACHE_SIZE) {
    // Evict a portion of the cache randomly to make space
    const keys = Array.from(syncMemoryCache.keys());
    for (let i = 0; i < Math.floor(MAX_CACHE_SIZE / 4); i++) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        const keyToRemove = keys.splice(randomIndex, 1)[0];
        if(keyToRemove) syncMemoryCache.delete(keyToRemove);
    }
  }
  
  syncMemoryCache.set(normalizedNameForCache, iconIdentifier);

  return iconIdentifier;
};

export const clearLocalIconCache = (): void => {
  syncMemoryCache.clear();
  console.log("[clearLocalIconCache] In-memory food icon cache CLEARED.");
};

export const logLocalIconCacheSize = (): void => {
  console.log(`[logLocalIconCacheSize] In-memory food icon cache size: ${syncMemoryCache.size}`);
};