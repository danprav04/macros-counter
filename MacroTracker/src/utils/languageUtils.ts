// src/utils/languageUtils.ts
import { LanguageCode } from '../types/settings';

// Basic script detection character ranges
const HEBREW_REGEX = /[\u0590-\u05FF]/;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const LATIN_REGEX = /[a-zA-Z]/;

/**
 * Detects the dominant language script in a given text.
 * It checks for the presence of Hebrew or Cyrillic characters first.
 * If neither script is found, it defaults to 'en' (representing Latin scripts).
 * This priority is effective for mixed-language strings where the non-Latin
 * script is the determining factor.
 * @param text The text to analyze.
 * @returns LanguageCode ('he', 'ru', or 'en' as default).
 */
export const detectLanguageFromText = (text: string): LanguageCode => {
    if (!text || text.trim() === '') {
        return 'en'; // Default if no text
    }

    // Prioritize non-Latin scripts as they are more distinctive identifiers.
    if (HEBREW_REGEX.test(text)) {
        return 'he';
    }
    if (CYRILLIC_REGEX.test(text)) {
        return 'ru';
    }
    
    // If no Hebrew or Cyrillic characters are found, default to 'en'.
    // This serves as a catch-all for Latin-based languages (English, French, etc.)
    // and correctly maps them to use the English tag set as a reliable fallback.
    return 'en';
};