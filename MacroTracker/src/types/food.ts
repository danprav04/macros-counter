// types/food.ts
export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Data structure for sharing food items. ID is omitted.
export type SharedFoodData = Omit<Food, 'id'>;