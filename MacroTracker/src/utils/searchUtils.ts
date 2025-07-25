import { Food } from '../types/food';
import { foodIconDefinitions } from '../assets/food_icons/iconDefinitions';
import i18n, { TranslationKey } from '../localization/i18n';
import { getFoodIconUrl } from './iconUtils';

/**
 * Finds foods that match a search term via their associated icon tags.
 * This is the "smart search" functionality.
 *
 * @param searchTerm The string to search for.
 * @param allFoods The complete list of foods in the library.
 * @returns An array of foods that matched the search term via tags.
 */
export const findFoodsByTagSearch = (searchTerm: string, allFoods: Food[]): Food[] => {
    if (!searchTerm || !allFoods) {
        return [];
    }

    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    if (lowercasedSearchTerm.length < 2) { // Don't search for very short terms
        return [];
    }

    const relevantIcons = new Set<string>();

    // Step 1: Find which icon categories are relevant to the search term.
    for (const definition of foodIconDefinitions) {
        const fullTagKey = `foodIconTags.${definition.tagKey}` as TranslationKey;
        
        // Check tags in all available languages for comprehensiveness,
        // as the search term could be in a different language from the user's current locale.
        const localesToSearch: ('en' | 'ru' | 'he')[] = ['en', 'ru', 'he'];
        for (const locale of localesToSearch) {
            const tagResult = i18n.t(fullTagKey, { locale, returnObjects: true, defaultValue: [] });
            const tags: string[] = Array.isArray(tagResult) ? tagResult : []; // Ensure 'tags' is always an array

            if (tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm))) {
                relevantIcons.add(definition.icon);
                break; // Found a match in this language, no need to check others for this definition
            }
        }
    }

    if (relevantIcons.size === 0) {
        return [];
    }

    // Step 2: Find all foods that map to these relevant icons.
    const matchedFoods: Food[] = [];
    for (const food of allFoods) {
        const foodIcon = getFoodIconUrl(food.name); // This uses a cache, so it's efficient.
        if (foodIcon && relevantIcons.has(foodIcon)) {
            matchedFoods.push(food);
        }
    }

    return matchedFoods;
};