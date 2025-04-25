// src/utils/iconUtils.ts
// Import necessary modules
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFoodIcon } from '../services/backendService'; // Import backend service

// Define the cache entry type (URL only, no expiry handled here)
type CacheEntry = {
  url: string | null;
};

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry>();

// Prefix for AsyncStorage keys (keeping versioning)
const STORAGE_KEY_PREFIX = 'foodIconCacheBE_v1_'; // BE = Backend

// --- Main Exported Function ---

/**
 * Gets the icon URL for a food item.
 * Checks memory cache, then AsyncStorage, then calls the backend service.
 * Caches the result (including null for failures/not found).
 *
 * @param foodName The name of the food item.
 * @param locale The desired locale for the icon search (defaults to 'en').
 * @returns A Promise resolving to the icon URL (string) or null if not found or an error occurred.
 */
export const getFoodIconUrl = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
  if (!foodName || foodName.trim() === '') {
      console.warn("getFoodIconUrl called with empty foodName.");
      return null;
  }

  const cacheKey = `${locale}_${foodName.toLowerCase().trim()}`;

  // 1. Check Memory Cache
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry !== undefined) { // Check existence, not just truthiness (null is valid cached value)
    // console.log(`Icon Cache HIT (Memory): ${cacheKey} -> ${memoryEntry.url}`);
    return memoryEntry.url;
  }

  // 2. Check AsyncStorage
  const storageKey = STORAGE_KEY_PREFIX + cacheKey;
  try {
    const storedValue = await AsyncStorage.getItem(storageKey);
    if (storedValue !== null) {
      const parsed: CacheEntry = JSON.parse(storedValue);
      // console.log(`Icon Cache HIT (Storage): ${cacheKey} -> ${parsed.url}`);
      memoryCache.set(cacheKey, parsed); // Update memory cache
      return parsed.url;
    }
  } catch (error) {
    console.error(`Error reading icon cache from AsyncStorage for key ${storageKey}:`, error);
    // Continue to fetch if storage read fails
  }

  // 3. Fetch from Backend API
  // console.log(`Icon Cache MISS / Fetching Backend API: ${cacheKey}`);
  let iconUrl: string | null = null;
  try {
      // Call the backend service function - it handles its own errors and returns null on failure
      iconUrl = await getFoodIcon(foodName, locale);
      // console.log(`Backend returned icon URL for ${foodName}: ${iconUrl}`);

  } catch (error) {
      // This catch block might be redundant if getFoodIcon handles all errors,
      // but kept as a safeguard against unexpected issues in the service call itself.
      console.error(`Unexpected error calling getFoodIcon service for ${foodName}:`, error);
      iconUrl = null; // Ensure null is cached on unexpected error during service call
  }

  // 4. Cache the final result (even nulls) from backend
  const newCacheEntry: CacheEntry = { url: iconUrl };
  memoryCache.set(cacheKey, newCacheEntry); // Cache in memory
  try {
    // Cache in AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify(newCacheEntry));
  } catch (error) {
    console.error(`Error saving icon cache to AsyncStorage for key ${storageKey}:`, error);
  }

  return iconUrl;
};

// --- Cache Management (Optional but recommended) ---

export const clearIconCache = async () => {
    memoryCache.clear();
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
        if (cacheKeys.length > 0) {
             await AsyncStorage.multiRemove(cacheKeys);
             console.log(`Cleared ${cacheKeys.length} items from AsyncStorage icon cache (Backend Version).`);
        }
    } catch (error) {
        console.error("Error clearing backend icon cache from AsyncStorage:", error);
    }
};

export const logMemoryCacheSize = () => {
    console.log(`In-memory icon cache size: ${memoryCache.size}`);
};