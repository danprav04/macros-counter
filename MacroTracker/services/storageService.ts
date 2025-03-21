// services/storageService.ts (No significant changes)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyEntry } from '../types/dailyEntry';
import { Food } from '../types/food';

const DAILY_ENTRIES_KEY = 'dailyEntries';
const FOODS_KEY = 'foods';
const SETTINGS_KEY = 'settings';

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
    throw error;
  }
};

export const loadFoods = async (): Promise<Food[]> => {
  try {
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    return foodsJson ? JSON.parse(foodsJson) : [];
  } catch (error) {
    console.error('Error loading foods:', error);
    return [];
  }
};

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  dailyGoals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  settingsHistory?: { date: string; settings: Settings }[]; // Add this line
}

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
    return settingsJson
      ? JSON.parse(settingsJson)
      : { theme: 'system', dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70} }; //Provide defaults for dailyGoals
  } catch (error) {
    console.error('Error loading settings:', error);
    return { theme: 'system', dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70} };
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