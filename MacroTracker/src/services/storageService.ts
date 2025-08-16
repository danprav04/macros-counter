// src/services/storageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyEntry } from '../types/dailyEntry';
import { Food } from '../types/food';
import { Settings, LanguageCode } from '../types/settings';

const DAILY_ENTRIES_KEY = 'dailyEntries';
const FOODS_KEY = 'foods';
const SETTINGS_KEY = 'settings';
const RECENT_FOODS_KEY = 'recentFoods';
const RECENT_SERVINGS_KEY = 'recentServings';

export type RecentServings = { [foodId: string]: number[] };

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
    console.error('Failed to parse daily entries from AsyncStorage. Clearing corrupted data.', error);
    await AsyncStorage.removeItem(DAILY_ENTRIES_KEY);
    return [];
  }
};

export const saveFoods = async (foods: Food[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(foods));
  } catch (error) {
    console.error('Error saving foods:', error);
    throw error;
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
    console.error('Failed to parse foods from AsyncStorage. Clearing corrupted data.', error);
    await AsyncStorage.removeItem(FOODS_KEY);
    return { items: [], total: 0 };
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
  const defaultSettings: Settings = {
    theme: 'system',
    language: 'system',
    dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
    settingsHistory: []
  };

  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!settingsJson) return defaultSettings;
    
    const loadedSettings = JSON.parse(settingsJson);

    return {
      ...defaultSettings,
      ...loadedSettings,
      dailyGoals: {
        ...defaultSettings.dailyGoals,
        ...(loadedSettings.dailyGoals || {})
      }
    };
  } catch (error) {
    console.error('Failed to parse settings from AsyncStorage. Clearing corrupted data and returning defaults.', error);
    await AsyncStorage.removeItem(SETTINGS_KEY);
    return defaultSettings;
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    const clientIdKey = '@MacroTracker:clientId';
    const authTokenKey = '@MacroTracker:authToken';
    const [clientId, authToken] = await AsyncStorage.multiGet([clientIdKey, authTokenKey]);
    
    await AsyncStorage.clear();
    
    const itemsToKeep: [string, string][] = [];
    if (clientId?.[1]) itemsToKeep.push(clientId as [string, string]);
    if (authToken?.[1]) itemsToKeep.push(authToken as [string, string]);

    if (itemsToKeep.length > 0) {
        await AsyncStorage.multiSet(itemsToKeep);
    }
    console.log('Application data cleared (excluding auth/client ID).');
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
        console.error('Failed to parse recent foods from AsyncStorage. Clearing corrupted data.', error);
        await AsyncStorage.removeItem(RECENT_FOODS_KEY);
        return [];
    }
};

export const saveRecentServings = async (servings: RecentServings): Promise<void> => {
    try {
        await AsyncStorage.setItem(RECENT_SERVINGS_KEY, JSON.stringify(servings));
    } catch (error) {
        console.error('Error saving recent servings:', error);
        throw error;
    }
};

export const loadRecentServings = async (): Promise<RecentServings> => {
    try {
        const servingsJson = await AsyncStorage.getItem(RECENT_SERVINGS_KEY);
        return servingsJson ? JSON.parse(servingsJson) : {};
    } catch (error) {
        console.error('Failed to parse recent servings from AsyncStorage. Clearing corrupted data.', error);
        await AsyncStorage.removeItem(RECENT_SERVINGS_KEY);
        return {};
    }
};