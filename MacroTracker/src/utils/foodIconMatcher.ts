// src/utils/foodIconMatcher.ts
import { foodIconDefinitions } from '../assets/food_icons/iconDefinitions';
import i18n, { t, TranslationKey } from '../localization/i18n';
import { LanguageCode } from '../types/settings';

const normalizeFoodNameForMatching = (name: string): string => {
    return name.toLowerCase()
        .replace(/[()",.&'/#!$%^*;:{}=_`~?]/g, '')
        .trim();
};

const getNormalizedWords = (name: string): string[] => {
    const normalizedName = normalizeFoodNameForMatching(name);
    const commonFilterWords = ['and', 'with', 'of', 'a', 'the', 'in', 'on', 'for', 'g', 'ml', 'гр', 'мл'];
    return normalizedName
        .split(/\s+/)
        .filter(word => word.length > 1 && !commonFilterWords.includes(word.toLowerCase()));
};

/**
 * Finds the best matching icon for a given food name based on localized tags.
 * @param foodName The name of the food.
 * @param foodNameLocale The detected language of the foodName string (e.g., 'en', 'ru', 'he').
 * @returns An emoji string for the icon, or null if no good match is found.
 */
export const findBestIcon = (foodName: string, foodNameLocale: LanguageCode): string | null => {
    if (!foodName || foodName.trim() === '') {
        return null;
    }

    const normalizedFoodNameQuery = normalizeFoodNameForMatching(foodName);
    const foodNameWords = getNormalizedWords(foodName);

    // console.log(`[findBestIcon START] Food: "${foodName}", NormQuery: "${normalizedFoodNameQuery}", Words: [${foodNameWords.join(', ')}], FoodNameLocale: ${foodNameLocale}`);

    let bestMatch: { icon: string; score: number; priority: number } | null = null;

    for (const definition of foodIconDefinitions) {
        let currentScore = 0;
        let matchFoundInDefinition = false;
        const fullTagKey = `foodIconTags.${definition.tagKey}` as TranslationKey;
        let localizedTags: string[] = [];
        let effectiveTagLocale: LanguageCode = foodNameLocale; // The locale from which tags were actually sourced

        try {
            const tagsForDetectedLocale = i18n.t(fullTagKey, { locale: foodNameLocale, returnObjects: true, defaultValue: null });

            if (Array.isArray(tagsForDetectedLocale) && tagsForDetectedLocale.length > 0) {
                localizedTags = tagsForDetectedLocale;
            } else {
                if (foodNameLocale !== 'en' && definition.tagKey !== 'unknownFood' && definition.tagKey !== 'genericMeal') {
                    const tagsForEnglishFallback = i18n.t(fullTagKey, { locale: 'en', returnObjects: true, defaultValue: [] });
                    if (Array.isArray(tagsForEnglishFallback) && tagsForEnglishFallback.length > 0) {
                        localizedTags = tagsForEnglishFallback;
                        effectiveTagLocale = 'en'; // Mark that we used English fallback tags
                    }
                }
            }
        } catch (e) {
            console.error(`[findBestIcon] ERROR fetching/processing translation for key: ${fullTagKey} in foodNameLocale: ${foodNameLocale}. FoodName: "${foodName}"`, e);
            localizedTags = [];
        }

        if (localizedTags.length === 0 && definition.tagKey !== 'unknownFood' && definition.tagKey !== 'genericMeal') {
            continue;
        }
        
        // if (definition.tagKey === 'redMeat' && normalizedFoodNameQuery.includes(normalizeFoodNameForMatching('סטייק'))) {
        //      console.log(`[findBestIcon DEBUG STEEK] Checking 'redMeat' for "${foodName}". Tags sourced from locale '${effectiveTagLocale}': [${localizedTags.join(', ')}]. Query: "${normalizedFoodNameQuery}"`);
        // }

        for (const localizedTag of localizedTags) {
            const lowerLocalizedTag = localizedTag.toLowerCase().trim();
            if (!lowerLocalizedTag) continue;

            if (lowerLocalizedTag === normalizedFoodNameQuery) {
                currentScore = Math.max(currentScore, 100);
                matchFoundInDefinition = true;
                break;
            }

            if (normalizedFoodNameQuery.includes(lowerLocalizedTag)) {
                currentScore = Math.max(currentScore, 70 + lowerLocalizedTag.length);
                matchFoundInDefinition = true;
            }
            
            if (foodNameWords.some(foodWord => foodWord.length > 1 && lowerLocalizedTag.includes(foodWord))) {
                currentScore = Math.max(currentScore, 60);
                matchFoundInDefinition = true;
            }
        }
        
        if (!matchFoundInDefinition && localizedTags.length > 0) {
            for (const localizedTag of localizedTags) {
                const tagWords = localizedTag.toLowerCase().trim().split(/\s+/).filter(tw => tw.length > 1);
                if (tagWords.some(tw => normalizedFoodNameQuery.includes(tw))) {
                    currentScore = Math.max(currentScore, 50);
                    matchFoundInDefinition = true;
                    break;
                }
            }
        }

        if (matchFoundInDefinition) {
            const priority = definition.priority || 0;
            if (!bestMatch || currentScore > bestMatch.score || (currentScore === bestMatch.score && priority > bestMatch.priority)) {
                bestMatch = { icon: definition.icon, score: currentScore, priority };
            }
        }
    }

    if (bestMatch && bestMatch.score > 0) {
        // console.log(`[findBestIcon SUCCESS] For "${foodName}" (FoodNameLocale: ${foodNameLocale}): ${bestMatch.icon} (Score: ${bestMatch.score}, Prio: ${bestMatch.priority})`);
        return bestMatch.icon;
    }

    const genericMealDefinition = foodIconDefinitions.find(def => def.tagKey === 'genericMeal');
    if (genericMealDefinition) {
        const genericMealKey = `foodIconTags.${genericMealDefinition.tagKey}` as TranslationKey;
        // Use foodNameLocale for generic meal tags as well.
        const genericMealTagsResult = i18n.t(genericMealKey, { locale: foodNameLocale, returnObjects: true, defaultValue: [] });
        if (Array.isArray(genericMealTagsResult) && genericMealTagsResult.some(tag => normalizedFoodNameQuery.includes(tag.toLowerCase().trim()))) {
            return genericMealDefinition.icon;
        }
    }
    
    const unknownFoodDefinition = foodIconDefinitions.find(def => def.tagKey === 'unknownFood');
    // console.log(`[findBestIcon NO MATCH] For "${foodName}" (FoodNameLocale: ${foodNameLocale}). Returning unknown icon: ${unknownFoodDefinition ? unknownFoodDefinition.icon : 'ERROR_NO_UNKNOWN_ICON_DEF'}`);
    return unknownFoodDefinition ? unknownFoodDefinition.icon : null;
};