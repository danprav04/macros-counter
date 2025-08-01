// __tests__/utils/searchUtils.test.ts
import { findFoodsByTagSearch } from '../../src/utils/searchUtils';
import { Food } from '../../src/types/food';
import i18n from '../../src/localization/i18n';
import * as iconUtils from '../../src/utils/iconUtils';

// Mock the icon utility to control the mapping from food name to icon
jest.mock('../../src/utils/iconUtils', () => ({
  getFoodIconUrl: jest.fn((foodName: string): string | null => {
    const name = foodName.toLowerCase();
    if (name.includes('apple')) return '🍎';
    if (name.includes('banana')) return '🍌';
    if (name.includes('chicken')) return '🍗';
    if (name.includes('salad')) return '🥗'; // Not a fruit
    return '❓';
  }),
}));

const mockFoods: Food[] = [
  { id: '1', name: 'Red Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '' },
  { id: '2', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, createdAt: '' },
  { id: '3', name: 'Grilled Chicken', calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: '' },
  { id: '4', name: 'Side Salad', calories: 30, protein: 1, carbs: 5, fat: 1, createdAt: '' },
  // Adding another fruit to test combination tags accurately
  { id: '5', name: 'Green Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '' },
];

describe('findFoodsByTagSearch', () => {
  afterEach(() => {
    // Reset locale to default after each test
    i18n.locale = 'en';
  });

  it('should return an empty array if search term is empty or too short', () => {
    expect(findFoodsByTagSearch('', mockFoods)).toEqual([]);
    expect(findFoodsByTagSearch('a', mockFoods)).toEqual([]);
  });

  it('should find foods by direct tag matching', () => {
    const results = findFoodsByTagSearch('apple', mockFoods);
    expect(results.length).toBe(2);
    expect(results.map(f => f.name)).toContain('Red Apple');
    expect(results.map(f => f.name)).toContain('Green Apple');
  });

  it('should find foods by combination tag matching (e.g., "fruit")', () => {
    const results = findFoodsByTagSearch('fruit', mockFoods);
    expect(results.length).toBe(3);
    expect(results.map(f => f.name)).toContain('Red Apple');
    expect(results.map(f => f.name)).toContain('Banana');
    expect(results.map(f => f.name)).toContain('Green Apple');
  });

  it('should be case-insensitive', () => {
    const results = findFoodsByTagSearch('FRUIT', mockFoods);
    expect(results.length).toBe(3);
  });

  it('should handle search terms for which no tags match', () => {
    const results = findFoodsByTagSearch('xyz', mockFoods);
    expect(results.length).toBe(0);
  });

  it('should work with non-english combination tags', () => {
    i18n.locale = 'ru';
    const results = findFoodsByTagSearch('фрукт', mockFoods);
    expect(results.length).toBe(3);
    expect(results.map(f => f.name)).toContain('Red Apple');
    expect(results.map(f => f.name)).toContain('Banana');
  });

  it('should not return duplicate foods if they match in multiple ways', () => {
    // "apple" is a direct tag, and it's part of the "fruit" combination tag
    const results = findFoodsByTagSearch('apple fruit', mockFoods);
    // Even if logic changes, the final result should be unique foods
    const uniqueIds = new Set(results.map(f => f.id));
    expect(results.length).toBe(uniqueIds.size);
  });
});