// src/utils/languageUtils.ts
import { LanguageCode } from '../types/settings';

// Basic script detection character ranges with global flag
const HEBREW_REGEX = /[\u0590-\u05FF]/g;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/g;
const LATIN_REGEX = /[a-zA-Z]/g;

/**
 * Detects the dominant language script in a given text by character count.
 * It checks for Hebrew, Cyrillic, and Latin characters and returns the code
 * for the most prevalent script. Defaults to 'en' in case of a tie or if
 * no identifiable characters are found.
 * @param text The text to analyze.
 * @returns LanguageCode ('he', 'ru', or 'en').
 */
export const detectLanguageFromText = (text: string): LanguageCode => {
    if (!text || text.trim() === '') {
        return 'en'; // Default if no text
    }

    const hebrewChars = (text.match(HEBREW_REGEX) || []).length;
    const cyrillicChars = (text.match(CYRILLIC_REGEX) || []).length;
    const latinChars = (text.match(LATIN_REGEX) || []).length;

    // Determine the dominant script based on character count
    if (hebrewChars > latinChars && hebrewChars > cyrillicChars) {
        return 'he';
    }
    if (cyrillicChars > latinChars && cyrillicChars > hebrewChars) {
        return 'ru';
    }
    
    // Default to English if Latin is dominant, in case of a tie, or for other scripts
    return 'en';
};