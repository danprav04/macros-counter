// src/utils/languageUtils.ts
import { LanguageCode } from '../types/settings';

// Basic script detection character ranges with global flag
const HEBREW_REGEX = /[\u0590-\u05FF]/g;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/g;
// Expanded Latin regex to include common diacritics
const LATIN_REGEX = /[a-zA-Z\u00C0-\u017F]/g;

/**
 * Detects the dominant language script in a given text by character count.
 * It checks for Hebrew, Cyrillic, and Latin characters and returns the code
 * for the most prevalent script. Defaults to 'en' if no identifiable script
 * dominates or in case of a tie.
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

    // Prioritize Hebrew and Cyrillic if they are clearly dominant.
    // This helps with short strings where a few Latin characters (like 'g' for grams)
    // might otherwise skew the result.
    if (hebrewChars > latinChars && hebrewChars > cyrillicChars) {
        return 'he';
    }
    if (cyrillicChars > latinChars && cyrillicChars > hebrewChars) {
        return 'ru';
    }
    
    // If scores are tied or Latin is highest, default to 'en'.
    // This is a safe fallback for mixed-language strings or primarily Latin-based text.
    return 'en';
};