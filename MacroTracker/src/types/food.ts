// types/food.ts
export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string; // ISO 8601 date string
}

// Data structure for sharing food items. ID and createdAt are omitted.
export type SharedFoodData = Omit<Food, 'id' | 'createdAt'>;