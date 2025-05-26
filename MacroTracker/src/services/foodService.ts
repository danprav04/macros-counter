// src/services/foodService.ts
// services/foodService.ts
import { Food } from '../types/food';
import { saveFoods, loadFoods } from './storageService';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const createFood = async (foodData: Omit<Food, 'id'>): Promise<Food> => {
  const newFood: Food = {
    id: uuidv4(),
    ...foodData,
  };
  const { items: currentFoods } = await loadFoods(); // Load all foods to append
  currentFoods.push(newFood);
  await saveFoods(currentFoods);
  return newFood;
};

export const getFoods = async (
  offset: number = 0,
  limit?: number,
  searchTerm?: string // New parameter for searching
): Promise<{ items: Food[], total: number }> => {
  // Load all foods first. For a real backend, the backend would handle filtering and pagination.
  const { items: allFoodsFromStorage } = await loadFoods(); // This loads all items

  let filteredFoods = allFoodsFromStorage;

  if (searchTerm && searchTerm.trim() !== "") {
    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    filteredFoods = allFoodsFromStorage.filter(food =>
      food.name.toLowerCase().includes(lowercasedSearchTerm)
    );
  }

  // After filtering (if any), then apply pagination
  const totalFiltered = filteredFoods.length;

  if (limit === undefined) {
    return { items: filteredFoods, total: totalFiltered };
  }

  const paginatedFoods = filteredFoods.slice(offset, offset + limit);
  return { items: paginatedFoods, total: totalFiltered };
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