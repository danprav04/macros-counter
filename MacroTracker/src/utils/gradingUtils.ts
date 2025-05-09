// src/utils/gradingUtils.ts
import { Food } from '../types/food';
import { Settings } from '../types/settings';

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FoodGradeResult {
    letter: GradeLetter;
    color: string;
    score: number; // Underlying score for potential adjustments
}

export const gradeColors: Record<GradeLetter, string> = {
    A: '#4CAF50', // Green
    B: '#8BC34A', // Light Green
    C: '#FFC107', // Amber/Yellow
    D: '#FF9800', // Orange
    F: '#F44336', // Red
};

const mapScoreToGradeDetails = (score: number): FoodGradeResult => {
    let letter: GradeLetter;
    const clampedScore = Math.max(0, Math.min(100, Math.round(score))); // Ensure score is 0-100

    if (clampedScore >= 85) letter = 'A';
    else if (clampedScore >= 70) letter = 'B';
    else if (clampedScore >= 55) letter = 'C';
    else if (clampedScore >= 40) letter = 'D';
    else letter = 'F';
    return { letter, color: gradeColors[letter], score: clampedScore };
};

/**
 * Calculates a base grade for a food item (per 100g) based on refined heuristics.
 * @param food The food item (calories, protein, carbs, fat per 100g).
 * @returns FoodGradeResult or null if grading is not possible.
 */
export const calculateBaseFoodGrade = (food: Food): FoodGradeResult | null => {
    if (!food || typeof food.calories !== 'number' || typeof food.protein !== 'number' || typeof food.carbs !== 'number' || typeof food.fat !== 'number') {
        return null;
    }

    const { calories, protein, carbs, fat } = food;
    let score = 70; // Start with a baseline score (e.g., C grade)

    // --- 1. Calorie Density (per 100g) ---
    if (calories < 100) score += 15; // Low density
    else if (calories < 200) score += 7;
    else if (calories > 350) score -= (calories - 350) * 0.08; // Penalize high density
    if (calories > 500) score -= 15; // Further penalty for very high density

    // --- 2. Protein Content (per 100g) ---
    if (protein > 20) score += 20; // Excellent protein
    else if (protein > 10) score += 10; // Good protein
    else if (protein < 5 && calories > 150) score -= 10; // Low protein for moderate/high cal food

    // --- 3. Fat Content & Type (Heuristic for "quality" based on balance) ---
    const caloriesFromFat = fat * 9;
    const percentageCaloriesFromFat = (calories > 0) ? (caloriesFromFat / calories) * 100 : 0;

    if (fat > 25) { // High total fat
        score -= (fat - 25) * 0.5;
        if (protein < fat * 0.5 && protein < 10) { // High fat, low protein suggests less ideal source
            score -= 10;
        }
    } else if (fat < 5 && percentageCaloriesFromFat < 20 && protein > 10) { // Low fat, potentially good if protein is present
        score += 5;
    }
    if (percentageCaloriesFromFat > 50) score -= 15; // More than 50% cals from fat is heavily penalized
    if (percentageCaloriesFromFat > 35 && percentageCaloriesFromFat <= 50) score -= 7;


    // --- 4. Carbohydrate Content & Type (Heuristic) ---
    const caloriesFromCarbs = carbs * 4;
    const percentageCaloriesFromCarbs = (calories > 0) ? (caloriesFromCarbs / calories) * 100 : 0;

    if (carbs > 40) { // High total carbs
        score -= (carbs - 40) * 0.3;
        if (protein < carbs * 0.1 && protein < 7) { // High carb, very low protein suggests refined carbs
            score -= 10;
        }
    }
    if (percentageCaloriesFromCarbs > 60) score -= 15; // More than 60% cals from carbs
    if (percentageCaloriesFromCarbs > 50 && percentageCaloriesFromCarbs <= 60) score -=7;

    // --- 5. Macronutrient Balance (Percentage of Calories) ---
    const caloriesFromProtein = protein * 4;
    const percentageCaloriesFromProtein = (calories > 0) ? (caloriesFromProtein / calories) * 100 : 0;

    // Ideal ranges (approx): Protein 20-30%, Fat 20-30%, Carbs 40-50%
    // Bonus for being within a generally healthy profile
    let balanceBonus = 0;
    if (percentageCaloriesFromProtein >= 15 && percentageCaloriesFromProtein <= 35) balanceBonus += 4;
    if (percentageCaloriesFromFat >= 15 && percentageCaloriesFromFat <= 35) balanceBonus += 4;
    if (percentageCaloriesFromCarbs >= 35 && percentageCaloriesFromCarbs <= 55) balanceBonus += 4;
    if (balanceBonus >=10) score += 10; // Max 10 points for good balance
    else if (balanceBonus >=8) score +=5;

    // Penalty for extreme imbalance if not already heavily penalized
    if (protein < 5 && fat > 20 && carbs > 30 && calories > 200) { // Low protein, high fat & carbs
        score -= 15;
    }

    return mapScoreToGradeDetails(score);
};

/**
 * Calculates a grade for a specific daily entry, considering portion size and daily goals.
 * @param food The food item.
 * @param consumedGrams The amount of the food consumed in grams.
 * @param dailyGoals The user's daily macronutrient goals.
 * @returns FoodGradeResult or null if grading is not possible.
 */
export const calculateDailyEntryGrade = (
    food: Food,
    consumedGrams: number,
    dailyGoals: Settings['dailyGoals']
): FoodGradeResult | null => {
    const baseGradeResult = calculateBaseFoodGrade(food);
    if (!baseGradeResult) return null;
    if (consumedGrams <= 0) return baseGradeResult;

    let currentScore = baseGradeResult.score;

    // Ensure dailyGoals are valid numbers, default to avoid division by zero or nonsensical percentages
    const safeGoals = {
        calories: Math.max(1, dailyGoals.calories || 2000), // Minimum 1 to avoid /0
        protein: Math.max(1, dailyGoals.protein || 100),
        carbs: Math.max(1, dailyGoals.carbs || 200),
        fat: Math.max(1, dailyGoals.fat || 70),
    };

    const factor = consumedGrams / 100;
    const consumedCalories = food.calories * factor;
    const consumedProtein = food.protein * factor;
    const consumedCarbs = food.carbs * factor;
    const consumedFat = food.fat * factor;

    // --- Adjustments based on portion size relative to daily goals ---

    // Penalty for consuming a large percentage of daily calorie allowance in one go
    const caloriePortionPercentage = (consumedCalories / safeGoals.calories) * 100;
    if (caloriePortionPercentage > 50) currentScore -= 20; // >50% of daily cals in one item
    else if (caloriePortionPercentage > 35) currentScore -= 10; // >35%

    // Penalty for consuming a large percentage of daily fat allowance
    const fatPortionPercentage = (consumedFat / safeGoals.fat) * 100;
    if (fatPortionPercentage > 60) currentScore -= 15; // >60% of daily fat
    else if (fatPortionPercentage > 40) currentScore -= 7;

    // Penalty for consuming a large percentage of daily carb allowance
    const carbPortionPercentage = (consumedCarbs / safeGoals.carbs) * 100;
    if (carbPortionPercentage > 60) currentScore -= 10; // >60% of daily carbs
    else if (carbPortionPercentage > 45) currentScore -= 5;

    // Bonus for significant protein contribution if calories are reasonable
    const proteinPortionPercentage = (consumedProtein / safeGoals.protein) * 100;
    if (proteinPortionPercentage > 25 && caloriePortionPercentage < 30) {
        currentScore += 10; // Good protein hit without too many cals
    } else if (proteinPortionPercentage > 15 && caloriePortionPercentage < 20) {
        currentScore += 5;
    }

    // Mitigation for small portions of "F" grade foods
    if (baseGradeResult.letter === 'F' && caloriePortionPercentage < 10) {
        currentScore += 15; // Small "treat" is less impactful
    } else if (baseGradeResult.letter === 'D' && caloriePortionPercentage < 7) {
        currentScore += 7;
    }

    // Slight penalty if a large portion of an "A" grade food makes macros significantly off for the day
    if (baseGradeResult.letter === 'A' &&
        (caloriePortionPercentage > 30 || fatPortionPercentage > 30 || carbPortionPercentage > 30) &&
        consumedGrams > 200 // and it's a large portion
    ) {
        currentScore -= 7;
    }

    return mapScoreToGradeDetails(currentScore);
};