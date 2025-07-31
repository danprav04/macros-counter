// __tests__/services/storageService.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveDailyEntries, loadDailyEntries,
  saveFoods, loadFoods,
  saveSettings, loadSettings,
  clearAllData,
  saveRecentFoods, loadRecentFoods,
  saveRecentServings, loadRecentServings
} from 'services/storageService';
import { DailyEntry } from 'types/dailyEntry';
import { Food } from 'types/food';
import { Settings } from 'types/settings';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
};

(AsyncStorage.getItem as jest.Mock).mockImplementation(mockAsyncStorage.getItem);
(AsyncStorage.setItem as jest.Mock).mockImplementation(mockAsyncStorage.setItem);
(AsyncStorage.removeItem as jest.Mock).mockImplementation(mockAsyncStorage.removeItem);
(AsyncStorage.clear as jest.Mock).mockImplementation(mockAsyncStorage.clear);
(AsyncStorage.multiGet as jest.Mock).mockImplementation(mockAsyncStorage.multiGet);
(AsyncStorage.multiSet as jest.Mock).mockImplementation(mockAsyncStorage.multiSet);


describe('storageService', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(mockAsyncStorage).forEach(mockFn => mockFn.mockClear());
  });
  
  const mockFood: Food = { id: '1', name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: new Date().toISOString() };
  const mockEntry: DailyEntry = { date: '2025-01-01', items: [{ food: mockFood, grams: 100 }] };
  const mockSettings: Settings = { theme: 'dark', language: 'en', dailyGoals: { calories: 2200, protein: 160, carbs: 210, fat: 75 }, settingsHistory: [] };

  // Daily Entries
  describe('Daily Entries', () => {
    it('should save and load daily entries correctly', async () => {
      await saveDailyEntries([mockEntry]);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('dailyEntries', JSON.stringify([mockEntry]));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockEntry]));
      const loaded = await loadDailyEntries();
      expect(loaded).toEqual([mockEntry]);
    });

    it('should return an empty array if no entries are saved', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const loaded = await loadDailyEntries();
      expect(loaded).toEqual([]);
    });

    it('should handle JSON parsing errors gracefully for entries', async () => {
        mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json');
        const loaded = await loadDailyEntries();
        expect(loaded).toEqual([]);
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('dailyEntries');
    });
  });

  // Foods
  describe('Foods', () => {
    it('should save and load foods correctly', async () => {
      await saveFoods([mockFood]);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('foods', JSON.stringify([mockFood]));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockFood]));
      const { items, total } = await loadFoods();
      expect(items).toEqual([mockFood]);
      expect(total).toBe(1);
    });

    it('should handle pagination when loading foods', async () => {
      const foodList = [
        { ...mockFood, id: '1' },
        { ...mockFood, id: '2' },
        { ...mockFood, id: '3' },
      ];
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(foodList));
      const { items, total } = await loadFoods(1, 1);
      expect(items).toEqual([{ ...mockFood, id: '2' }]);
      expect(total).toBe(3);
    });
    
    it('should handle JSON parsing errors gracefully for foods', async () => {
        mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json');
        const loaded = await loadFoods();
        expect(loaded.items).toEqual([]);
        expect(loaded.total).toBe(0);
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('foods');
    });
  });

  // Settings
  describe('Settings', () => {
    it('should save and load settings correctly', async () => {
      await saveSettings(mockSettings);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('settings', JSON.stringify(mockSettings));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockSettings));
      const loaded = await loadSettings();
      expect(loaded).toEqual(mockSettings);
    });

    it('should return default settings if none are saved', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const loaded = await loadSettings();
      expect(loaded.theme).toBe('system');
      expect(loaded.language).toBe('system');
    });

    it('should merge loaded settings with defaults', async () => {
        const partialSettings = { theme: 'light' }; // language and goals are missing
        mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(partialSettings));
        const loaded = await loadSettings();
        expect(loaded.theme).toBe('light');
        expect(loaded.language).toBe('system'); // from default
        expect(loaded.dailyGoals.calories).toBe(2000); // from default
    });
  });

  // Recent Foods
  describe('Recent Foods', () => {
    it('should save and load recent foods', async () => {
        await saveRecentFoods([mockFood]);
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('recentFoods', JSON.stringify([mockFood]));
        
        mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockFood]));
        const loaded = await loadRecentFoods();
        expect(loaded).toEqual([mockFood]);
    });
  });

  // Recent Servings
  describe('Recent Servings', () => {
      const servings = { 'food-1': [100, 150] };
      it('should save and load recent servings', async () => {
          await saveRecentServings(servings);
          expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('recentServings', JSON.stringify(servings));
          
          mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(servings));
          const loaded = await loadRecentServings();
          expect(loaded).toEqual(servings);
      });
  });

  // Clear All Data
  describe('clearAllData', () => {
    it('should clear all data except client ID and auth token', async () => {
      mockAsyncStorage.multiGet.mockResolvedValue([
        ['@MacroTracker:clientId', 'test-client-id'],
        ['@MacroTracker:authToken', 'test-auth-token'],
      ]);
      
      await clearAllData();
      
      expect(mockAsyncStorage.clear).toHaveBeenCalled();
      expect(mockAsyncStorage.multiSet).toHaveBeenCalledWith([
        ['@MacroTracker:clientId', 'test-client-id'],
        ['@MacroTracker:authToken', 'test-auth-token'],
      ]);
    });

    it('should not fail if client ID or token are missing', async () => {
        mockAsyncStorage.multiGet.mockResolvedValue([
            ['@MacroTracker:clientId', null],
            ['@MacroTracker:authToken', null],
        ]);

        await clearAllData();

        expect(mockAsyncStorage.clear).toHaveBeenCalled();
        expect(mockAsyncStorage.multiSet).not.toHaveBeenCalled();
    });

    it('should re-throw errors from AsyncStorage', async () => {
        const error = new Error('Storage failed');
        mockAsyncStorage.clear.mockRejectedValueOnce(error);
        await expect(clearAllData()).rejects.toThrow(error);
    });
  });
});