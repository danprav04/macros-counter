// src/services/foodService.ts
import { Food } from '../types/food';
import { saveFoods, loadFoods } from './storageService';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const createFood = async (foodData: Omit<Food, 'id' | 'createdAt'>): Promise<Food> => {
  const newFood: Food = {
    id: uuidv4(),
    ...foodData,
    createdAt: new Date().toISOString(),
  };
  const { items: currentFoods } = await loadFoods(); // Load all foods to append
  currentFoods.push(newFood);
  await saveFoods(currentFoods);
  return newFood;
};

export const getFoods = async (
  searchTerm?: string,
  sortOption: 'name' | 'newest' | 'oldest' = 'name'
): Promise<{ items: Food[], total: number }> => {
  // Load all foods first.
  const { items: allFoodsFromStorage } = await loadFoods();

  let filteredFoods = allFoodsFromStorage;

  if (searchTerm && searchTerm.trim() !== "") {
    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    filteredFoods = allFoodsFromStorage.filter(food =>
      food.name.toLowerCase().includes(lowercasedSearchTerm)
    );
  }

  // Sorting logic
  if (sortOption === 'name') {
      filteredFoods.sort((a, b) => a.name.localeCompare(b.name));
  } else {
      const fallbackDate = '2020-01-01T00:00:00.000Z'; // For items without a creation date
      filteredFoods.sort((a, b) => {
          const dateA = new Date(a.createdAt || fallbackDate).getTime();
          const dateB = new Date(b.createdAt || fallbackDate).getTime();
          return sortOption === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }

  const totalFiltered = filteredFoods.length;

  // Return all filtered and sorted items without pagination
  return { items: filteredFoods, total: totalFiltered };
};

export const updateFood = async (updatedFood: Food): Promise<Food> => {
  const { items: foods } = await loadFoods(); // Load all foods to find and update
  const index = foods.findIndex((f) => f.id === updatedFood.id);
  if (index === -1) {
    throw new Error('Food not found'); // Throw an error if not found
  }
  foods[index] = updatedFood;
  await saveFoods(foods);
  return updatedFood;
};

export const deleteFood = async (foodId: string): Promise<void> => {
  const { items: foods } = await loadFoods(); // Load all to filter
  const filteredFoods = foods.filter((f) => f.id !== foodId);
  await saveFoods(filteredFoods);
};