// src/utils/gradingUtils.ts
import { Food } from '../types/food';
import { Settings } from '../types/settings'; // For DailyGoals type

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FoodGradeResult {
    letter: GradeLetter;
    color: string;
    score: number;
}

// Static color mapping for grades
export const gradeColors: Record<GradeLetter, string> = {
    A: '#4CAF50', // Green
    B: '#8BC34A', // Light Green
    C: '#FFC107', // Amber/Yellow (using theme.warning as reference)
    D: '#FF9800', // Orange
    F: '#F44336', // Red
};

const mapScoreToGradeDetails = (score: number): FoodGradeResult => {
    let letter: GradeLetter;
    if (score >= 90) letter = 'A';
    else if (score >= 80) letter = 'B';
    else if (score >= 70) letter = 'C';
    else if (score >= 60) letter = 'D';
    else letter = 'F';
    return { letter, color: gradeColors[letter], score };
};

/**
 * Calculates a base grade for a food item (per 100g).
 * @param food The food item (must contain calories, protein, carbs, fat per 100g).
 * @returns FoodGradeResult or null if grading is not possible.
 */
export const calculateBaseFoodGrade = (food: Food): FoodGradeResult | null => {
    if (!food || typeof food.calories !== 'number' || typeof food.protein !== 'number' || typeof food.carbs !== 'number' || typeof food.fat !== 'number') {
        return null;
    }

    const { calories, protein, carbs, fat } = food;

    // Max scores for components
    const maxCalScore = 40;
    const maxProteinScore = 30;
    const maxFatScoreContribution = 15; // Fat score is neutral up to a point, then penalizes
    const maxCarbScoreContribution = 15; // Carb score is neutral up to a point, then penalizes

    // Calories Score (lower is better)
    // Optimal around 0-100 kcal. Max score at 0-50kcal, drops to 0 score at 450kcal.
    let calScore = Math.max(0, maxCalScore * (1 - (Math.max(0, calories - 50)) / 400));


    // Protein Score (higher is better, up to a point)
    // Max score at 20g protein or more.
    let proteinScore = Math.min(maxProteinScore, (protein / 20) * maxProteinScore);

    // Fat Score (penalize high fat)
    // Ideal fat up to 10g/100g. Penalty increases beyond that.
    // Full contribution up to 5g, then decreases. 0 contribution at 25g. Negative beyond.
    let fatScore = maxFatScoreContribution;
    if (fat > 5) { // Start reducing score if fat > 5g
      fatScore = Math.max(-maxFatScoreContribution, maxFatScoreContribution * (1 - (fat - 5) / 20));
    }


    // Carb Score (penalize very high carbs, assuming simple/less nutrient-dense)
    // Full contribution up to 20g, then decreases. 0 contribution at 70g. Negative beyond.
    let carbScore = maxCarbScoreContribution;
    if (carbs > 20) { // Start reducing score if carbs > 20g
      carbScore = Math.max(-maxCarbScoreContribution, maxCarbScoreContribution * (1 - (carbs - 20) / 50));
    }

    let totalScore = calScore + proteinScore + fatScore + carbScore;
    totalScore = Math.max(0, Math.min(100, totalScore)); // Clamp score between 0 and 100

    return mapScoreToGradeDetails(totalScore);
};

/**
 * Calculates a grade for a specific daily entry, considering portion size and daily goals.
 * @param food The food item.
 *   @param consumedGrams The amount of the food consumed in grams.
 * @param dailyGoals The user's daily macronutrient goals.
 * @returns FoodGradeResult or null if grading is not possible.
 */
export const calculateDailyEntryGrade = (
    food: Food,
    consumedGrams: number,
    dailyGoals: Settings['dailyGoals']
): FoodGradeResult | null => {
    const baseGrade = calculateBaseFoodGrade(food);
    if (!baseGrade) return null;
    if (consumedGrams <= 0) return baseGrade; // No consumption, return base grade or null if preferred

    // Ensure dailyGoals are valid numbers, default to high value if 0 to avoid division by zero in percentage calcs if goal is to minimize
    // For percentage calculations, a 0 goal means any amount is "infinite %", so handle carefully.
    const safeGoals = {
        calories: dailyGoals.calories > 0 ? dailyGoals.calories : 2000, // Default if 0
        protein: dailyGoals.protein > 0 ? dailyGoals.protein : 100,     // Default if 0
        carbs: dailyGoals.carbs > 0 ? dailyGoals.carbs : 200,         // Default if 0
        fat: dailyGoals.fat > 0 ? dailyGoals.fat : 70,               // Default if 0
    };

    const factor = consumedGrams / 100;
    const consumedCalories = food.calories * factor;
    const consumedProtein = food.protein * factor;
    const consumedCarbs = food.carbs * factor;
    const consumedFat = food.fat * factor;

    let adjustment = 0;

    // --- Penalties based on % of daily goal from this single item ---
    // If a goal is actually set to 0 by user (meaning "avoid"), any consumption should be penalized.
    
    // Fat Impact
    const fatPercentOfGoal = (consumedFat / safeGoals.fat) * 100;
    if (dailyGoals.fat === 0 && consumedFat > 1) { // User wants to avoid fat
        adjustment -= 20; // Strong penalty
    } else if (fatPercentOfGoal > 35) { // Consumed a large chunk of daily fat allowance
        adjustment -= (fatPercentOfGoal - 35) * 0.25;
    }
    // Additional penalty if the food itself is very high fat and a large portion is eaten
    if (food.fat > 25 && consumedGrams > 100) { // food.fat is per 100g
        adjustment -= 5 * (consumedGrams / 100);
    }

    // Carb Impact
    const carbsPercentOfGoal = (consumedCarbs / safeGoals.carbs) * 100;
    if (dailyGoals.carbs === 0 && consumedCarbs > 5) { // User wants to avoid carbs
        adjustment -= 15; // Strong penalty
    } else if (carbsPercentOfGoal > 45) { // Consumed a large chunk of daily carb allowance
        adjustment -= (carbsPercentOfGoal - 45) * 0.2;
    }
    if (food.carbs > 50 && consumedGrams > 150) {
         adjustment -= 5 * (consumedGrams / 150);
    }
    
    // Calorie Impact (Penalize very large calorie portions from a single item)
    const caloriesPercentOfGoal = (consumedCalories / safeGoals.calories) * 100;
    if (caloriesPercentOfGoal > 40) { // More than 40% of daily calories in one item
        adjustment -= (caloriesPercentOfGoal - 40) * 0.2;
    }

    // --- Bonuses ---
    // Protein Bonus: Meeting a good portion of protein goal efficiently
    const proteinPercentOfGoal = (consumedProtein / safeGoals.protein) * 100;
    if (proteinPercentOfGoal > 25 && caloriesPercentOfGoal < 30) {
        adjustment += 7; // Good protein contribution without excessive calories
    }

    // General "small portion of an F-grade food" mitigation
    if (baseGrade.letter === 'F' && consumedGrams < 50) {
        adjustment += 10; // Small portion of a "bad" food is less bad
    }
    // General "large portion of an A-grade food" slight reduction if macros are still high
    if (baseGrade.letter === 'A' && (caloriesPercentOfGoal > 30 || fatPercentOfGoal > 30 || carbsPercentOfGoal > 30)) {
        adjustment -= 5;
    }


    const finalScore = Math.max(0, Math.min(100, baseGrade.score + adjustment));
    return mapScoreToGradeDetails(finalScore);
};