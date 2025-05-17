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

export const getFoods = async (offset: number = 0, limit?: number): Promise<{ items: Food[], total: number }> => {
  return loadFoods(offset, limit);
};

export const updateFood = async (updatedFood: Food): Promise<Food> => {
  const { items: foods, total } = await loadFoods(); // Load all foods to find and update
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