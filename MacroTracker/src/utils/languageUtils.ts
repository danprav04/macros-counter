// src/utils/languageUtils.ts
import { LanguageCode } from '../types/settings';

// Basic script detection character ranges
const HEBREW_REGEX = /[\u0590-\u05FF]/;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
// Basic Latin check - very broad, English will be the default for this
const LATIN_REGEX = /[a-zA-Z]/;

/**
 * Detects the dominant language script in a given text.
 * Prioritizes Hebrew, then Cyrillic. If neither is dominant,
 * defaults to 'en' (representing Latin script languages for icon tag purposes).
 * @param text The text to analyze.
 * @returns LanguageCode ('he', 'ru', or 'en' as default).
 */
export const detectLanguageFromText = (text: string): LanguageCode => {
    if (!text || text.trim() === '') {
        return 'en'; // Default if no text
    }

    let hebrewChars = 0;
    let cyrillicChars = 0;
    let latinChars = 0;
    let otherChars = 0;

    for (const char of text) {
        if (HEBREW_REGEX.test(char)) {
            hebrewChars++;
        } else if (CYRILLIC_REGEX.test(char)) {
            cyrillicChars++;
        } else if (LATIN_REGEX.test(char)) {
            latinChars++;
        } else {
            otherChars++;
        }
    }

    // Simple dominance check
    // Give a higher weight or lower threshold for Hebrew/Cyrillic if names are often short
    if (hebrewChars > latinChars / 2 && hebrewChars > cyrillicChars) { // If Hebrew chars are significant
        return 'he';
    }
    if (cyrillicChars > latinChars / 2 && cyrillicChars > hebrewChars) { // If Cyrillic chars are significant
        return 'ru';
    }
    
    // If primarily Latin, or mixed with no clear non-Latin dominance, default to 'en'
    // This 'en' will then correctly use English tags.
    // If the text was, e.g., French and we default to 'en', English tags are a reasonable fallback.
    return 'en';
};