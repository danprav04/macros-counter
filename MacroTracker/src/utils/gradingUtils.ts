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
    let score = 70; // Start with a baseline score (e.g., B- grade)

    // --- 1. Calorie Density (per 100g) ---
    if (calories < 100) score += 15; // Low density
    else if (calories < 200) score += 7;
    else if (calories > 350) score -= (calories - 350) * 0.08; // Penalize high density
    if (calories > 500) score -= 20; // Further penalty for very high density

    // --- 2. Protein Content (per 100g) ---
    if (protein > 20) score += 18;
    else if (protein > 10) score += 10;
    else if (protein < 5 && calories > 150) score -= 10; // Low protein for moderate/high cal food

    // --- 3. Fat Content & Type (Heuristic for "quality" based on balance) ---
    const caloriesFromFat = fat * 9;
    const percentageCaloriesFromFat = (calories > 0) ? (caloriesFromFat / calories) * 100 : 0;

    if (fat > 25) { // High total fat
        score -= (fat - 25) * 0.5;
        if (protein < fat * 0.5 && protein < 10) { // High fat, low protein suggests less ideal source
            score -= 10;
        }
    }
    if (percentageCaloriesFromFat > 50) score -= 15;
    else if (percentageCaloriesFromFat > 35) score -= 7;

    // --- 4. Carbohydrate Content & Type (Heuristic) ---
    const caloriesFromCarbs = carbs * 4;
    const percentageCaloriesFromCarbs = (calories > 0) ? (caloriesFromCarbs / calories) * 100 : 0;
    
    if (carbs > 40 && calories > 100) { // High total carbs in non-trivial food
        score -= (carbs - 40) * 0.3;
        if (protein < carbs * 0.1 && protein < 7) { // High carb, very low protein suggests refined carbs
            score -= 12;
        }
    }
    if (percentageCaloriesFromCarbs > 60) score -= 15;
    else if (percentageCaloriesFromCarbs > 50) score -= 7;

    // --- 5. Macronutrient Balance & Synergy Adjustments ---
    const caloriesFromProtein = protein * 4;
    const percentageCaloriesFromProtein = (calories > 0) ? (caloriesFromProtein / calories) * 100 : 0;
    let balanceBonus = 0;
    if (percentageCaloriesFromProtein >= 15 && percentageCaloriesFromProtein <= 40) balanceBonus += 4;
    if (percentageCaloriesFromFat >= 15 && percentageCaloriesFromFat <= 40) balanceBonus += 4;
    if (percentageCaloriesFromCarbs >= 35 && percentageCaloriesFromCarbs <= 55) balanceBonus += 4;
    if (balanceBonus >= 10) score += 10;
    else if (balanceBonus >= 8) score += 5;

    // Mitigate fat penalty for high-protein foods (like salmon)
    if (protein > 18 && percentageCaloriesFromFat > 35) {
        score += 20;
    }
    // Mitigate fat penalty for healthy-fat foods (like avocado)
    if (fat > 10 && carbs < 10 && protein < 5) {
        score += 20;
    }

    // Penalty for extreme imbalance if not already heavily penalized
    if (protein < 5 && fat > 20 && carbs > 30 && calories > 200) {
        score -= 15;
    }

    // Boost for low calorie, moderately balanced foods (like quinoa)
    if (calories <= 120 && protein >= 4 && carbs >= 20 && fat >= 2) {
        score += 20;
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

    const safeGoals = {
        calories: Math.max(1, dailyGoals.calories || 2000),
        protein: Math.max(1, dailyGoals.protein || 100),
        carbs: Math.max(1, dailyGoals.carbs || 200),
        fat: Math.max(1, dailyGoals.fat || 70),
    };

    const factor = consumedGrams / 100;
    const consumedCalories = food.calories * factor;
    const consumedProtein = food.protein * factor;
    const consumedCarbs = food.carbs * factor;
    const consumedFat = food.fat * factor;

    const caloriePortionPercentage = (consumedCalories / safeGoals.calories) * 100;
    if (caloriePortionPercentage > 50) currentScore -= 30; // More aggressive penalty
    else if (caloriePortionPercentage > 35) currentScore -= 20;

    const fatPortionPercentage = (consumedFat / safeGoals.fat) * 100;
    if (fatPortionPercentage > 60) currentScore -= 15;
    else if (fatPortionPercentage > 40) currentScore -= 7;

    const carbPortionPercentage = (consumedCarbs / safeGoals.carbs) * 100;
    if (carbPortionPercentage > 60) currentScore -= 10;
    else if (carbPortionPercentage > 45) currentScore -= 5;

    const proteinPortionPercentage = (consumedProtein / safeGoals.protein) * 100;
    if (proteinPortionPercentage > 25 && caloriePortionPercentage < 30) {
        currentScore += 10;
    } else if (proteinPortionPercentage > 15 && caloriePortionPercentage < 20) {
        currentScore += 5;
    }
    
    // Mitigation for small portions of "F" grade foods
    if (baseGradeResult.letter === 'F' && caloriePortionPercentage < 10) {
        currentScore += 25;
    } else if (baseGradeResult.letter === 'D' && caloriePortionPercentage < 7) {
        currentScore += 7;
    }

    // Penalize large (but not excessive) portions of A-grade foods
    if (baseGradeResult.score >= 85 && caloriePortionPercentage > 25) {
        currentScore -= 10;
    }

    return mapScoreToGradeDetails(currentScore);
};