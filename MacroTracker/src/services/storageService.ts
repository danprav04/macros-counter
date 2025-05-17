// src/services/storageService.ts
// services/storageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyEntry } from '../types/dailyEntry';
import { Food } from '../types/food';
import { Settings, LanguageCode } from '../types/settings'; // Import LanguageCode
import { formatISO, parseISO } from 'date-fns';


const DAILY_ENTRIES_KEY = 'dailyEntries';
const FOODS_KEY = 'foods';
const SETTINGS_KEY = 'settings';
const RECENT_FOODS_KEY = 'recentFoods';
const LAST_USED_PORTIONS_KEY = 'lastUsedPortions'; // New key

export type LastUsedPortions = { [foodId: string]: number }; // Type for last used portions

export const saveDailyEntries = async (entries: DailyEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(DAILY_ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving daily entries:', error);
    throw error;
  }
};

export const loadDailyEntries = async (): Promise<DailyEntry[]> => {
  try {
    const entriesJson = await AsyncStorage.getItem(DAILY_ENTRIES_KEY);
    return entriesJson ? JSON.parse(entriesJson) : [];
  } catch (error) {
    console.error('Error loading daily entries:', error);
    return [];
  }
};

export const saveFoods = async (foods: Food[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(foods));
  } catch (error) {
    console.error('Error saving foods:', error);
    throw error; // Re-throw the error
  }
};

export const loadFoods = async (offset: number = 0, limit?: number): Promise<{ items: Food[], total: number }> => {
  try {
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    const allFoods: Food[] = foodsJson ? JSON.parse(foodsJson) : [];
    const total = allFoods.length;

    if (limit === undefined) {
      return { items: allFoods, total };
    }
    
    const paginatedFoods = allFoods.slice(offset, offset + limit);
    return { items: paginatedFoods, total };
  } catch (error) {
    console.error('Error loading foods:', error);
    return { items: [], total: 0 }; // Return an empty array and 0 total on error
  }
};



export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const loadSettings = async (): Promise<Settings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    const loadedSettings = settingsJson ? JSON.parse(settingsJson) : {};

    // Apply defaults and ensure structure
    const defaultSettings: Settings = {
      theme: 'system',
      language: 'system', // Default language
      dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
      settingsHistory: [] // Ensure settingsHistory exists
    };


    return {
      ...defaultSettings, // Start with defaults
        ...loadedSettings, // Override with loaded values
        dailyGoals: {
          ...defaultSettings.dailyGoals,  //ensure no fields missing from daily goals
            ...(loadedSettings.dailyGoals || {}) // And override *those* with any loaded dailyGoals
        }
    };

  } catch (error: any) {
    console.error('Error loading settings:', error);

    if (error.message.includes('Row too big')) {
      console.warn('Detected oversized settings data. Clearing settings.');
      try {
        await AsyncStorage.removeItem(SETTINGS_KEY);
      } catch (clearError) {
        console.error('Error clearing oversized settings:', clearError);
      }
    }

    return {
      theme: 'system',
      language: 'system', // Default language on error
      dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
      settingsHistory: []
    };
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    // Keep clientID, clear everything else
    const clientIdKey = '@MacroTracker:clientId';
    const clientId = await AsyncStorage.getItem(clientIdKey);
    
    await AsyncStorage.clear();
    
    if (clientId) {
        await AsyncStorage.setItem(clientIdKey, clientId);
    }
    console.log('Application data cleared (excluding Client ID).');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};

export const saveRecentFoods = async (foods: Food[]) => {
    try {
        await AsyncStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(foods));
    } catch (error) {
        console.error('Error saving recent foods:', error);
        throw error;
    }
};

export const loadRecentFoods = async (): Promise<Food[]> => {
    try {
        const foodsJson = await AsyncStorage.getItem(RECENT_FOODS_KEY);
        return foodsJson ? JSON.parse(foodsJson) : [];
    } catch (error) {
        console.error('Error loading recent foods:', error);
        return [];
    }
};

export const saveLastUsedPortions = async (portions: LastUsedPortions): Promise<void> => {
    try {
        await AsyncStorage.setItem(LAST_USED_PORTIONS_KEY, JSON.stringify(portions));
    } catch (error) {
        console.error('Error saving last used portions:', error);
        throw error;
    }
};

export const loadLastUsedPortions = async (): Promise<LastUsedPortions> => {
    try {
        const portionsJson = await AsyncStorage.getItem(LAST_USED_PORTIONS_KEY);
        return portionsJson ? JSON.parse(portionsJson) : {};
    } catch (error) {
        console.error('Error loading last used portions:', error);
        return {};
    }
};