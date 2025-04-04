// services/storageService.ts (Modified for Timestamps)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyEntry } from '../types/dailyEntry';
import { Food } from '../types/food';
import { Settings } from '../types/settings';
import { formatISO, parseISO } from 'date-fns';


const DAILY_ENTRIES_KEY = 'dailyEntries';
const FOODS_KEY = 'foods';
const SETTINGS_KEY = 'settings';
const RECENT_FOODS = 'recentFoods';


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
    }

  } catch (error: any) {
    console.error('Error loading settings:', error);

    // *** KEY CHANGE: Handle "Row too big" error ***
    if (error.message.includes('Row too big')) {
      console.warn('Detected oversized settings data. Clearing settings.');
      try {
        await AsyncStorage.removeItem(SETTINGS_KEY); // Clear the oversized data
      } catch (clearError) {
        console.error('Error clearing oversized settings:', clearError);
        // You might want to handle this more gracefully, e.g., by showing an error to the user.
      }
    }

    // Return defaults if loading fails (or after clearing)
    return {
      theme: 'system',
      dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
      settingsHistory: [] // Ensure settingsHistory exists in default
    };
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};

// Function to save recent foods
export const saveRecentFoods = async (foods: Food[]) => {
    try {
        await AsyncStorage.setItem(RECENT_FOODS, JSON.stringify(foods));
    } catch (error) {
        console.error('Error saving recent foods:', error);
        throw error; // Important: Re-throw the error so calling code knows it failed
    }
};

// Function to load recent foods
export const loadRecentFoods = async (): Promise<Food[]> => {
    try {
        const foods = await AsyncStorage.getItem(RECENT_FOODS);
        return foods ? JSON.parse(foods) : [];
    } catch (error) {
        console.error('Error loading recent foods:', error);
        return []; // Return empty array on error, don't throw
    }
};