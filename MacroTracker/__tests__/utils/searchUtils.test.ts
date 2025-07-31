// __tests__/utils/searchUtils.test.ts
import { findFoodsByTagSearch } from 'utils/searchUtils';
import { Food } from 'types/food';
import i18n from 'localization/i18n';

// Mock getFoodIconUrl to control the icon returned for a food name.
jest.mock('utils/iconUtils', () => ({
  getFoodIconUrl: jest.fn((name: string) => {
    if (name.toLowerCase().includes('apple')) return '🍎';
    if (name.toLowerCase().includes('banana')) return '🍌';
    if (name.toLowerCase().includes('chicken')) return '🍗';
    if (name.toLowerCase().includes('steak')) return '🥩';
    if (name.toLowerCase().includes('salad')) return '🥗';
    return '❓';
  }),
}));

const mockFoods: Food[] = [
  { id: '1', name: 'Red Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '' },
  { id: '2', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, createdAt: '' },
  { id: '3', name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: '' },
  { id: '4', name: 'Sirloin Steak', calories: 200, protein: 29, carbs: 0, fat: 9, createdAt: '' },
  { id: '5', name: 'Garden Salad', calories: 50, protein: 2, carbs: 10, fat: 1, createdAt: '' },
];

describe('findFoodsByTagSearch', () => {
  beforeEach(() => {
    i18n.locale = 'en'; // Ensure a consistent locale
  });
  
  it('should return an empty array if search term is empty or too short', () => {
    expect(findFoodsByTagSearch('', mockFoods)).toEqual([]);
    expect(findFoodsByTagSearch('a', mockFoods)).toEqual([]);
  });

  it('should find foods by a direct tag match', () => {
    const results = findFoodsByTagSearch('apple', mockFoods);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Red Apple');
  });

  it('should find foods using a combination tag like "fruit"', () => {
    const results = findFoodsByTagSearch('fruit', mockFoods);
    expect(results.length).toBe(2);
    expect(results.map(f => f.name)).toContain('Red Apple');
    expect(results.map(f => f.name)).toContain('Banana');
  });

  it('should find foods using a combination tag like "meat"', () => {
    const results = findFoodsByTagSearch('meat', mockFoods);
    expect(results.length).toBe(2);
    expect(results.map(f => f.name)).toContain('Grilled Chicken Breast');
    expect(results.map(f => f.name)).toContain('Sirloin Steak');
  });

  it('should be case-insensitive', () => {
    const results = findFoodsByTagSearch('FRUIT', mockFoods);
    expect(results.length).toBe(2);
  });
  
  it('should handle search terms for which no tags match', () => {
    const results = findFoodsByTagSearch('xyz-no-match', mockFoods);
    expect(results).toEqual([]);
  });
  
  it('should work with non-english combination tags', () => {
    i18n.locale = 'ru';
    const results = findFoodsByTagSearch('фрукт', mockFoods);
    expect(results.length).toBe(2);
    expect(results.map(f => f.name)).toContain('Red Apple');
    expect(results.map(f => f.name)).toContain('Banana');
  });

  it('should find food by a partial tag match in any language', () => {
    // "salat" is part of the german word for salad, "insalata" (italian), "салат" (russian)
    // Here we'll test against the russian one
    i18n.locale = 'ru';
    const results = findFoodsByTagSearch('салат', mockFoods);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Garden Salad');
  });
});