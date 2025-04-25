// src/utils/iconUtils.ts
// Import necessary modules
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFoodIcon, BackendError } from '../services/backendService'; // Import backend service

// Define the cache entry type (URL only, no expiry handled here)
type CacheEntry = {
  url: string | null;
};

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry>();

// Prefix for AsyncStorage keys (keeping versioning)
const STORAGE_KEY_PREFIX = 'foodIconCacheBE_v1_'; // BE = Backend

// --- Main Exported Function ---

export const getFoodIconUrl = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
  if (!foodName || foodName.trim() === '') {
      return null;
  }

  const cacheKey = `${locale}_${foodName.toLowerCase().trim()}`;

  // 1. Check Memory Cache
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry) {
    // console.log(`Icon Cache HIT (Memory): ${cacheKey}`);
    return memoryEntry.url;
  }

  // 2. Check AsyncStorage
  const storageKey = STORAGE_KEY_PREFIX + cacheKey;
  try {
    const storedValue = await AsyncStorage.getItem(storageKey);
    if (storedValue) {
      const parsed: CacheEntry = JSON.parse(storedValue);
      // console.log(`Icon Cache HIT (Storage): ${cacheKey}`);
      memoryCache.set(cacheKey, parsed); // Update memory cache
      return parsed.url;
    }
  } catch (error) {
    console.error('Error reading icon cache from AsyncStorage:', error);
    // Continue to fetch if storage read fails
  }

  // 3. Fetch from Backend API
  console.log(`Icon Cache MISS / Fetching Backend API: ${cacheKey}`);
  let iconUrl: string | null = null;
  try {
      // Call the backend service function
      iconUrl = await getFoodIcon(foodName, locale);
      console.log(`Backend returned icon URL for ${foodName}: ${iconUrl}`);

  } catch (error) {
      // Backend service already logs errors, just handle the outcome
      console.error(`Error fetching icon from backend for ${foodName}:`, error);
      iconUrl = null; // Ensure null is cached on error
      // Do not show Alert here, let the calling component decide UI response
  }


  // 4. Cache the final result (even nulls) from backend
  const newCacheEntry: CacheEntry = { url: iconUrl };
  memoryCache.set(cacheKey, newCacheEntry);
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(newCacheEntry));
  } catch (error) {
    console.error('Error saving icon cache to AsyncStorage:', error);
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

// Removed scoring and direct Pixabay fetch logic as it's now in the backend service.