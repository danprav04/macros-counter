// Import necessary modules
import AsyncStorage from '@react-native-async-storage/async-storage';

// Consider moving API Key to environment variables for better security
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
const STORAGE_KEY_PREFIX = 'foodIconCacheV3_'; // Incremented version for new scoring/strategy

// --- Helper Functions ---

/**
 * Scores a Pixabay hit based on relevance criteria, prioritizing minimalistic illustrations.
 * Higher score is better.
 */
const scoreHit = (hit: any, foodName: string): number => {
  let score = 0;
  const tags = (hit.tags?.toLowerCase() || '').split(',').map((t: string) => t.trim());
  const lowerFoodName = foodName.toLowerCase();
  const foodNameWords = lowerFoodName.split(' ').filter(w => w.length > 0);
  const hitType = hit.type?.toLowerCase();

  // 0. Penalize Photos heavily if they somehow match
  if (hitType === 'photo') {
    return 0; // Give photos zero score as they are not illustrations/vectors
  }

  // 1. Exact Tag Match for Food Name (Base Relevance)
  if (tags.includes(lowerFoodName)) {
    score += 100;
  } else if (foodNameWords.every(word => tags.includes(word))) {
     score += 50;
  } else if (tags.some((tag: string) => tag.includes(lowerFoodName))) {
       score += 10;
   }

   // If no food name match at all, it's probably irrelevant
   if (score === 0 && !tags.some((tag: string) => foodNameWords.some(foodWord => tag.includes(foodWord)))) {
       return 0;
   }

  // 2. Style Keyword Bonus (PRIORITY for Minimalistic Illustration)
  const styleKeywords = {
    "minimal": 60, "minimalist": 60, "flat": 50, "simple": 40, // High priority
    "illustration": 45, "vector": 40, // Preferred types
    "icon": 35, "clipart": 30, // Good indicators
    "drawing": 15, "sketch": 10 // Lower priority but still illustration-like
  };
  tags.forEach((tag: string) => {
    if (tag in styleKeywords) {
      score += styleKeywords[tag as keyof typeof styleKeywords];
    }
  });

  // 3. Image Type Bonus (Reinforce Illustration/Vector)
  if (hitType === 'illustration') {
      score += 40;
  } else if (hitType === 'vector') { // Note: Pixabay often returns PNGs even for vectors
      score += 50; // Slightly prefer vector type if specified
  }

  // 4. File Type Preference (SVG > PNG)
  const url = (hit.largeImageURL || hit.webformatURL || '').toLowerCase();
  if (url.endsWith('.svg')) { // Less common via Pixabay API results, but ideal
      score += 30;
  } else if (url.endsWith('.png')) {
      score += 10; // PNG is good for icons
  }

  // 5. Transparency Hint Bonus
   if (tags.includes('transparent') || tags.includes('isolated') || tags.includes('white background') || tags.includes('no background')) {
       score += 15; // Higher bonus for potential transparency
   }

   // 6. Bonus for higher resolution (using largeImageURL as proxy)
   if (hit.largeImageURL) {
       score += 5;
   }

  return score;
};

/**
 * Fetches from Pixabay API and finds the best matching icon based on scoring.
 */
const fetchAndProcessPixabay = async (
    query: string,
    imageType: 'vector' | 'illustration' | 'all',
    foodName: string
): Promise<string | null> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    // Enforce illustration/vector type where possible, allow 'all' as fallback
    const typeParam = (imageType === 'all') ? 'illustration,vector' : imageType;
    const url = `${API_ENDPOINT}?key=${API_KEY}&q=${encodedQuery}&image_type=${typeParam}&category=food&safesearch=true&per_page=30`; // Fetch slightly more

    console.log(`Fetching Pixabay: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Pixabay API request failed for query "${query}": Status ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.hits || data.hits.length === 0) {
      console.log(`Pixabay: No hits for query "${query}" (type: ${typeParam})`);
      return null;
    }

    // Score and sort the hits
    const scoredHits = data.hits
      .map((hit: any) => ({
        hit,
        score: scoreHit(hit, foodName),
        url: hit.largeImageURL || hit.webformatURL // Prefer higher resolution
      }))
      // Filter out items with no URL or a score below a reasonable threshold (e.g., 50)
      // to avoid very poor matches. Adjust threshold as needed.
      .filter((item: any) => item.url && item.score >= 50);

    scoredHits.sort((a: any, b: any) => b.score - a.score); // Sort descending by score

    if (scoredHits.length > 0) {
      console.log(`Pixabay: Best match for "${foodName}" (Query: "${query}", Type: ${typeParam}) - Score: ${scoredHits[0].score}, URL: ${scoredHits[0].url}`);
      return scoredHits[0].url;
    } else {
       console.log(`Pixabay: No suitable hits after filtering (score >= 50) for query "${query}" (type: ${typeParam})`);
    }

    return null;

  } catch (error) {
    console.error(`Error during Pixabay fetch for query "${query}":`, error);
    return null;
  }
};

// --- Main Exported Function ---

export const getFoodIconUrl = async (foodName: string, locale: string = 'en'): Promise<string | null> => {
  if (!foodName || foodName.trim() === '') {
      return null;
  }

  const cacheKey = `${locale}_${foodName.toLowerCase().trim()}`;
  const now = Date.now();

  // 1. Check Memory Cache
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && memoryEntry.expiry > now) {
    return memoryEntry.url;
  }

  // 2. Check AsyncStorage
  const storageKey = STORAGE_KEY_PREFIX + cacheKey;
  try {
    const storedValue = await AsyncStorage.getItem(storageKey);
    if (storedValue) {
      const parsed: CacheEntry = JSON.parse(storedValue);
      if (parsed.expiry > now) {
        memoryCache.set(cacheKey, parsed); // Update memory cache
        return parsed.url;
      } else {
        await AsyncStorage.removeItem(storageKey);
        memoryCache.delete(cacheKey);
      }
    }
  } catch (error) {
    console.error('Error accessing AsyncStorage:', error);
  }

  // 3. Fetch from API - Prioritize Minimalistic Illustrations
  console.log(`Cache Miss / Fetching API: ${cacheKey}`);
  let iconUrl: string | null = null;

  // Define query strategies, prioritizing specific terms and types
  const queryStrategies: { query: string; imageType: 'vector' | 'illustration' | 'all' }[] = [
    // Most Specific First
    { query: `${foodName}`, imageType: 'illustration' },
    { query: `${foodName}`, imageType: 'vector' },
     { query: `${foodName} icon`, imageType: 'all' }, // 'all' here will be filtered to illustration,vector by fetchAndProcessPixabay
  ];

  for (const strategy of queryStrategies) {
    // Pass the original foodName for accurate scoring
    iconUrl = await fetchAndProcessPixabay(strategy.query, strategy.imageType, foodName);
    if (iconUrl) {
      break; // Found a suitable icon
    }
  }

  // 4. Cache the final result (even nulls)
  const newCacheEntry: CacheEntry = { url: iconUrl, expiry: now + CACHE_TTL };
  memoryCache.set(cacheKey, newCacheEntry);
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(newCacheEntry));
  } catch (error) {
    console.error('Error saving to AsyncStorage:', error);
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
             console.log(`Cleared ${cacheKeys.length} items from AsyncStorage icon cache.`);
        }
    } catch (error) {
        console.error("Error clearing icon cache from AsyncStorage:", error);
    }
};

export const logMemoryCacheSize = () => {
    console.log(`In-memory icon cache size: ${memoryCache.size}`);
};