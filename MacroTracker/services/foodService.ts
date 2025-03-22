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
  const foods = await loadFoods();
  foods.push(newFood);
  await saveFoods(foods);
  return newFood;
};

export const getFoods = async (): Promise<Food[]> => {
  return loadFoods();
};

export const updateFood = async (updatedFood: Food): Promise<Food> => {
  const foods = await loadFoods();
  const index = foods.findIndex((f) => f.id === updatedFood.id);
  if (index === -1) {
    throw new Error('Food not found'); // Throw an error if not found
  }
  foods[index] = updatedFood;
  await saveFoods(foods);
  return updatedFood;
};

export const deleteFood = async (foodId: string): Promise<void> => {
  const foods = await loadFoods();
  const filteredFoods = foods.filter((f) => f.id !== foodId);
  await saveFoods(filteredFoods);
};