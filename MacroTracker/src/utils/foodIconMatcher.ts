// src/utils/foodIconMatcher.ts
import { foodIconDefinitions, FoodIconDefinition } from '../assets/food_icons/iconDefinitions';

// Normalize food name for matching (simple version)
const normalizeFoodName = (name: string): string[] => {
    // Lowercase, split into words, remove common suffixes like 's' (simple pluralization)
    // This can be expanded with more sophisticated normalization.
    return name.toLowerCase()
        .replace(/[()",.]/g, '') // Remove some punctuation
        .split(/\s+/)
        .map(word => word.replace(/s$/, '')) // Basic plural 's' removal
        .filter(word => word.length > 1); // Ignore very short words/particles
};

/**
 * Finds the best matching icon for a given food name based on tags.
 * @param foodName The name of the food.
 * @param locale Currently unused, but kept for potential future locale-specific matching.
 * @returns An emoji string for the icon, or null if no good match is found.
 */
export const findBestIcon = (foodName: string, locale: string = 'en'): string | null => {
    if (!foodName || foodName.trim() === '') {
        return null;
    }

    const normalizedFoodWords = normalizeFoodName(foodName);
    const lowerCaseFoodName = foodName.toLowerCase();

    let bestMatch: { icon: string; score: number; priority: number } | null = null;

    for (const definition of foodIconDefinitions) {
        let currentScore = 0;
        let matchFound = false;

        for (const tag of definition.tags) {
            // Exact full name match in tags (high score)
            if (tag === lowerCaseFoodName) {
                currentScore = Math.max(currentScore, 100);
                matchFound = true;
                break; 
            }
            // Check if any normalized food word is part of the tag (e.g., "chicken" in "chicken breast")
            // Or if the tag is a substring of the food name (e.g. "apple" in "gala apple")
            if (normalizedFoodWords.some(foodWord => tag.includes(foodWord) || lowerCaseFoodName.includes(tag))) {
                currentScore = Math.max(currentScore, 50 + tag.length); // Longer tags that match are better
                matchFound = true;
            }
        }

        if (matchFound) {
            const priority = definition.priority || 0;
            // Prioritize higher score, then higher priority
            if (!bestMatch || currentScore > bestMatch.score || (currentScore === bestMatch.score && priority > bestMatch.priority)) {
                bestMatch = { icon: definition.icon, score: currentScore, priority };
            }
        }
    }

    // If a match was found, return its icon. Otherwise, try to find a generic fallback or return null.
    if (bestMatch && bestMatch.score > 0) {
        return bestMatch.icon;
    }

    // Fallback to the generic 'food' icon if no specific match
    const genericFoodIcon = foodIconDefinitions.find(def => def.tags.includes('food') && def.priority === 1);
    if (genericFoodIcon) return genericFoodIcon.icon;
    
    // Ultimate fallback
    const fallbackIcon = foodIconDefinitions.find(def => def.priority === 0);
    return fallbackIcon ? fallbackIcon.icon : null;
};