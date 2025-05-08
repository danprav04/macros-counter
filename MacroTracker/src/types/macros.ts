// src/types/macros.ts

// Basic macro structure
export interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
  
  // Macros structure including the identified food name
  export interface MacrosWithFoodName extends Macros {
    foodName: string;
  }
  
  /**
   * Represents a single food item estimated from an image,
   * including its name, estimated weight, and macros per 100g.
   * Matches the structure expected/returned by the backend service.
   */
  export interface EstimatedFoodItem {
    foodName: string;
    estimatedWeightGrams: number;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  }