// src/utils/searchUtils.ts
import { Food } from '../types/food';
import { foodIconDefinitions } from '../assets/food_icons/iconDefinitions';
import i18n, { TranslationKey } from '../localization/i18n';
import { getFoodIconUrl } from './iconUtils';
import { combinationTags } from '../assets/food_icons/combinationTags';

/**
 * Finds foods that match a search term via their associated icon tags.
 * This is the "smart search" functionality. It supports both direct tag
 * matching (e.g., searching "apple") and combination tag matching
 * (e.g., searching "fruit" to find apples, bananas, etc.).
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
    const iconsMap = new Map(foodIconDefinitions.map(def => [def.tagKey, def.icon]));

    // --- Step 1: Check for combination tag matches ---
    if (combinationTags[lowercasedSearchTerm]) {
        const tagKeys = combinationTags[lowercasedSearchTerm];
        for (const tagKey of tagKeys) {
            const icon = iconsMap.get(tagKey);
            if (icon) {
                relevantIcons.add(icon);
            }
        }
    }

    // --- Step 2: Find which icon categories are relevant to the search term (direct matching) ---
    for (const definition of foodIconDefinitions) {
        const fullTagKey = `foodIconTags.${definition.tagKey}` as TranslationKey;
        
        // Check tags in all available languages for comprehensiveness
        const localesToSearch: ('en' | 'ru' | 'he')[] = ['en', 'ru', 'he'];
        for (const locale of localesToSearch) {
            const tagResult = i18n.t(fullTagKey, { locale, returnObjects: true, defaultValue: [] });
            const tags: string[] = Array.isArray(tagResult) ? tagResult : [];

            if (tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm))) {
                relevantIcons.add(definition.icon);
                break; // Found a match in this language, no need to check others for this definition
            }
        }
    }

    if (relevantIcons.size === 0) {
        return [];
    }

    // --- Step 3: Find all foods that map to these relevant icons ---
    const matchedFoods: Food[] = [];
    for (const food of allFoods) {
        const foodIcon = getFoodIconUrl(food.name); // This uses a cache, so it's efficient.
        if (foodIcon && relevantIcons.has(foodIcon)) {
            matchedFoods.push(food);
        }
    }

    return matchedFoods;
};