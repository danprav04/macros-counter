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

const escapeRegExp = (text: string): string => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
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


    let bestMatch: { icon: string; score: number; priority: number; matchLength: number } | null = null;

    for (const definition of foodIconDefinitions) {
        let currentScore = 0;
        let bestMatchLength = 0;
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

            const isExactMatch = lowerLocalizedTag === normalizedFoodNameQuery;
            if (isExactMatch) {
                if (100 > currentScore) {
                    currentScore = 100;
                    bestMatchLength = lowerLocalizedTag.length;
                }
                matchFoundInDefinition = true;
                break;
            }

            const isWordMatch = new RegExp(`(^|\\s)${escapeRegExp(lowerLocalizedTag)}(\\s|$)`).test(normalizedFoodNameQuery);
            if (isWordMatch) {
                if (70 > currentScore) {
                    currentScore = 70;
                    bestMatchLength = lowerLocalizedTag.length;
                } else if (70 === currentScore) {
                    bestMatchLength = Math.max(bestMatchLength, lowerLocalizedTag.length);
                }
                matchFoundInDefinition = true;
            }
            
            const tagWords = lowerLocalizedTag.split(/\s+/);
            const isPartialWordMatch = foodNameWords.some(foodWord => 
                foodWord.length > 1 && tagWords.some(tagWord => tagWord === foodWord || (foodWord.length > 3 && tagWord.includes(foodWord)))
            );
            if (isPartialWordMatch) {
                if (60 > currentScore) {
                    currentScore = 60;
                    bestMatchLength = lowerLocalizedTag.length;
                } else if (60 === currentScore) {
                    bestMatchLength = Math.max(bestMatchLength, lowerLocalizedTag.length);
                }
                matchFoundInDefinition = true;
            }
        }
        
        if (!matchFoundInDefinition && localizedTags.length > 0) {
            for (const localizedTag of localizedTags) {
                const tagWords = localizedTag.toLowerCase().trim().split(/\s+/).filter(tw => tw.length > 1);
                const tagJoined = tagWords.join('');
                const foodJoined = foodNameWords.join('');
                
                const isAnyTagWordMatch = ((tagJoined.length > 3 && foodJoined.includes(tagJoined)) || tagWords.some(tw => {
                    if (new RegExp(`(^|\\s)${escapeRegExp(tw)}(\\s|$)`).test(normalizedFoodNameQuery)) return true;
                    return foodNameWords.some(fw => {
                        return (tw.length > 3 && fw.includes(tw) && Math.abs(fw.length - tw.length) <= 3) ||
                               (tw.length > 2 && fw.startsWith(tw) && fw.length - tw.length <= 2);
                    });
                }));

                if (isAnyTagWordMatch) {
                    if (50 > currentScore) {
                        currentScore = 50;
                        bestMatchLength = tagWords.join(' ').length;
                    }
                    matchFoundInDefinition = true;
                    break;
                }
            }
        }

        if (matchFoundInDefinition) {
            const priority = definition.priority || 0;
            const isBetterScore = !bestMatch || currentScore > bestMatch.score;
            const isSameScoreBetterPriority = bestMatch && currentScore === bestMatch.score && priority > bestMatch.priority;
            const isSameScoreSamePriorityBetterLength = bestMatch && currentScore === bestMatch.score && priority === bestMatch.priority && bestMatchLength > bestMatch.matchLength;
            
            if (isBetterScore || isSameScoreBetterPriority || isSameScoreSamePriorityBetterLength) {
                bestMatch = { icon: definition.icon, score: currentScore, priority, matchLength: bestMatchLength };
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
        if (Array.isArray(genericMealTagsResult)) {
            const hasGenericTagMatch = genericMealTagsResult.some(tag => {
                const lowerTag = tag.toLowerCase().trim();
                return new RegExp(`(^|\\s)${escapeRegExp(lowerTag)}(\\s|$)`).test(normalizedFoodNameQuery);
            });
            if (hasGenericTagMatch) {
                return genericMealDefinition.icon;
            }
        }
    }
    
    const unknownFoodDefinition = foodIconDefinitions.find(def => def.tagKey === 'unknownFood');
    // console.log(`[findBestIcon NO MATCH] For "${foodName}" (FoodNameLocale: ${foodNameLocale}). Returning unknown icon: ${unknownFoodDefinition ? unknownFoodDefinition.icon : 'ERROR_NO_UNKNOWN_ICON_DEF'}`);
    return unknownFoodDefinition ? unknownFoodDefinition.icon : null;
};