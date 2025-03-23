// utils/iconUtils.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = '25170800-59d7530d1a73abe661796e093';
const API_ENDPOINT = "https://pixabay.com/api/";

// Define the cache entry type
type CacheEntry = {
  url: string | null;
  expiry: number;
};

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry>();

// Cache TTL: 3 days in milliseconds
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000;

// Prefix for AsyncStorage keys
const STORAGE_KEY_PREFIX = 'foodIconCache_';

export const getFoodIconUrl = async (foodName: string): Promise<string | null> => {
  const cacheKey = foodName.toLowerCase();
  const now = Date.now();

  // 1. Check the in-memory cache first.
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && memoryEntry.expiry > now) {
    return memoryEntry.url;
  }

  // 2. Check persistent AsyncStorage.
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + cacheKey);
    if (storedValue) {
      const parsed: CacheEntry = JSON.parse(storedValue);
      if (parsed.expiry > now) {
        // Update in-memory cache with the persistent value.
        memoryCache.set(cacheKey, parsed);
        return parsed.url;
      } else {
        // Remove expired entry.
        await AsyncStorage.removeItem(STORAGE_KEY_PREFIX + cacheKey);
      }
    }
  } catch (error) {
    console.error('Error accessing AsyncStorage:', error);
  }
  

  // 3. No valid cached result, fetch from the API.
  try {
    const query = encodeURIComponent(`${foodName} minimal icon transparent`);
    const url = `${API_ENDPOINT}?key=${API_KEY}&q=${query}&image_type=vector&category=food&safesearch=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    let iconUrl: string | null = null;
    
    if (data.hits && data.hits.length > 0) {
      const filtered = data.hits.filter((hit: any) => {
        const hitUrl: string = hit.webformatURL.toLowerCase();
        return (hitUrl.endsWith('.png') || hitUrl.includes('svg')) &&
               hit.tags?.toLowerCase().includes(foodName.toLowerCase());
      });
      
      if (filtered.length > 0) {
        iconUrl = filtered[0].webformatURL;
      }
    }
    
    // Create a new cache entry with expiry.
    const newCacheEntry: CacheEntry = { url: iconUrl, expiry: now + CACHE_TTL };
    
    // Update both in-memory and persistent caches.
    memoryCache.set(cacheKey, newCacheEntry);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PREFIX + cacheKey, JSON.stringify(newCacheEntry));
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
    
    return iconUrl;
  } catch (error) {
    console.error("Error fetching food icon:", error);
    return null;
  }
};
