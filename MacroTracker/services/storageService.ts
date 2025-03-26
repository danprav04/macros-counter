// services/storageService.ts (Updated)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyEntry } from '../types/dailyEntry';
import { Food } from '../types/food';
import { Settings } from '../types/settings'; // Make sure Settings includes language?: string;
import { formatISO, parseISO } from 'date-fns';

const DAILY_ENTRIES_KEY = 'dailyEntries';
const FOODS_KEY = 'foods';
const SETTINGS_KEY = 'settings';
const RECENT_FOODS = 'recentFoods';
const LANGUAGE_KEY = 'userLanguage'; // Key for storing user's language choice

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

export const loadFoods = async (): Promise<Food[]> => {
  try {
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    return foodsJson ? JSON.parse(foodsJson) : [];
  } catch (error) {
    console.error('Error loading foods:', error);
    return []; // Return an empty array on error
  }
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    // Ensure language is explicitly handled if needed before saving
    const settingsToSave = { ...settings };
    // No specific manipulation needed here if language is optional and undefined is acceptable
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const loadSettings = async (): Promise<Settings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    const loadedSettings = settingsJson ? JSON.parse(settingsJson) : {};

    // Define default settings structure including language
    const defaultSettings: Settings = {
      theme: 'system',
      dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
      settingsHistory: [], // Ensure settingsHistory exists
      language: undefined, // Default language is undefined
    };

    // --- Type Safety Check for Language ---
    let languageValue = loadedSettings.language;
    if (languageValue !== undefined && typeof languageValue !== 'string') {
        console.warn(`Invalid language type found in settings storage (${typeof languageValue}), resetting to undefined.`);
        languageValue = undefined; // Reset to undefined if not string or undefined
    }
    // --- End Type Safety Check ---

    // Merge defaults with loaded settings, ensuring structure and types
    const finalSettings: Settings = {
      ...defaultSettings, // Start with defaults
      ...loadedSettings, // Override with loaded values
      language: languageValue, // Use the validated language value
      dailyGoals: {
        ...defaultSettings.dailyGoals, // Ensure all goal fields exist
        ...(loadedSettings.dailyGoals || {}), // Override with loaded goals
      },
      // Ensure settingsHistory is an array if it exists in loadedSettings
      settingsHistory: Array.isArray(loadedSettings.settingsHistory)
        ? loadedSettings.settingsHistory
        : defaultSettings.settingsHistory,
    };

    return finalSettings;

  } catch (error: any) {
    console.error('Error loading settings:', error);

    // Handle specific error for oversized data
    if (error.message.includes('Row too big')) {
      console.warn('Detected oversized settings data. Clearing settings.');
      try {
        await AsyncStorage.removeItem(SETTINGS_KEY); // Clear the corrupted data
      } catch (clearError) {
        console.error('Error clearing oversized settings:', clearError);
      }
    }

    // Return defaults if any loading error occurs (or after clearing)
    const defaultReturn: Settings = {
      theme: 'system',
      dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
      settingsHistory: [],
      language: undefined, // Ensure language is in the default return
    };
    return defaultReturn;
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    // Be specific about what to clear if needed, or clear everything
    // await AsyncStorage.multiRemove([DAILY_ENTRIES_KEY, FOODS_KEY, SETTINGS_KEY, RECENT_FOODS, LANGUAGE_KEY]);
    await AsyncStorage.clear(); // Clears everything managed by AsyncStorage for this app
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};

// --- Recent Foods ---
export const saveRecentFoods = async (foods: Food[]) => {
    try {
        await AsyncStorage.setItem(RECENT_FOODS, JSON.stringify(foods));
    } catch (error) {
        console.error('Error saving recent foods:', error);
        throw error;
    }
};

export const loadRecentFoods = async (): Promise<Food[]> => {
    try {
        const foods = await AsyncStorage.getItem(RECENT_FOODS);
        return foods ? JSON.parse(foods) : [];
    } catch (error) {
        console.error('Error loading recent foods:', error);
        return [];
    }
};

// --- Language Preference ---
// Used by i18n detector and potentially Settings screen

export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language preference:', error);
    throw error;
  }
};

export const loadLanguage = async (): Promise<string | null> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    // Add safety check: ensure loaded value is a string or null
    if (language !== null && typeof language !== 'string') {
        console.warn(`Invalid language type found in language storage (${typeof language}), returning null.`);
        await AsyncStorage.removeItem(LANGUAGE_KEY); // Remove invalid entry
        return null;
    }
    return language; // Returns string or null
  } catch (error) {
    console.error('Error loading language preference:', error);
    return null; // Return null on error
  }
};