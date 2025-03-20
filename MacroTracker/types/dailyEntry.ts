// types/dailyEntry.ts
import { Food } from "./food";

export interface DailyEntryItem {
  food: Food;
  grams: number;
}

export interface DailyEntry {
  date: string; // YYYY-MM-DD format
  items: DailyEntryItem[];
  goals?: {  // Optional goals
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}