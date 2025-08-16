// __tests__/services/foodService.test.ts
import { createFood, getFoods, updateFood, deleteFood } from 'services/foodService';
import * as storageService from 'services/storageService';
import { Food } from 'types/food';

jest.mock('services/storageService');
jest.mock('react-native-uuid', () => ({ v4: () => 'mock-uuid' }));

const mockedLoadFoods = storageService.loadFoods as jest.Mock;
const mockedSaveFoods = storageService.saveFoods as jest.Mock;

const mockFoodList: Food[] = [
  { id: '1', name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '2023-01-01T12:00:00.000Z' },
  { id: '2', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, createdAt: '2023-01-03T12:00:00.000Z' },
  { id: '3', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: '2023-01-02T12:00:00.000Z' },
];

describe('foodService', () => {

  beforeEach(() => {
    mockedLoadFoods.mockClear();
    mockedSaveFoods.mockClear();
  });

  describe('createFood', () => {
    it('should create a new food item with a UUID and timestamp', async () => {
      mockedLoadFoods.mockResolvedValue({ items: [], total: 0 });
      const foodData = { name: 'New Food', calories: 100, protein: 10, carbs: 5, fat: 2 };
      
      const newFood = await createFood(foodData);
      
      expect(newFood.id).toBe('mock-uuid');
      expect(newFood.name).toBe('New Food');
      expect(newFood.createdAt).toBeDefined();
      expect(mockedSaveFoods).toHaveBeenCalledWith([expect.objectContaining(foodData)]);
    });
  });

  describe('getFoods', () => {
    it('should return all foods sorted by name by default', async () => {
        mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
        const { items } = await getFoods();
        expect(items.map(f => f.name)).toEqual(['Apple', 'Banana', 'Chicken Breast']);
    });

    it('should filter foods by search term (case-insensitive)', async () => {
        mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
        const { items } = await getFoods('apple');
        expect(items.length).toBe(1);
        expect(items[0].name).toBe('Apple');
    });

    it('should return foods sorted by newest', async () => {
        mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
        const { items } = await getFoods(undefined, 'newest');
        expect(items.map(f => f.name)).toEqual(['Banana', 'Chicken Breast', 'Apple']);
    });
    
    it('should return foods sorted by oldest', async () => {
        mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
        const { items } = await getFoods(undefined, 'oldest');
        expect(items.map(f => f.name)).toEqual(['Apple', 'Chicken Breast', 'Banana']);
    });
  });

  describe('updateFood', () => {
    it('should update an existing food item', async () => {
      mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
      const updatedFoodData = { ...mockFoodList[0], name: 'Golden Apple' };
      
      const result = await updateFood(updatedFoodData);
      
      expect(result.name).toBe('Golden Apple');
      const savedFoods = mockedSaveFoods.mock.calls[0][0];
      expect(savedFoods.find((f: Food) => f.id === '1').name).toBe('Golden Apple');
    });

    it('should throw an error if food to update is not found', async () => {
      mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
      const nonExistentFood = { id: '99', name: 'Ghost Food', calories: 0, protein: 0, carbs: 0, fat: 0, createdAt: '' };
      
      await expect(updateFood(nonExistentFood)).rejects.toThrow('Food not found');
    });
  });

  describe('deleteFood', () => {
    it('should delete a food item by its ID', async () => {
      mockedLoadFoods.mockResolvedValue({ items: [...mockFoodList], total: 3 });
      
      await deleteFood('2'); // Delete Banana
      
      const savedFoods = mockedSaveFoods.mock.calls[0][0];
      expect(savedFoods.length).toBe(2);
      expect(savedFoods.find((f: Food) => f.id === '2')).toBeUndefined();
    });
  });
});