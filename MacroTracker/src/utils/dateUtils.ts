// src/utils/dateUtils.ts
// utils/dateUtils.ts
import { format, parseISO, formatISO, isValid } from 'date-fns';
import { getDateFnLocale } from '../localization/i18n'; // Import for locale

/**
 * Formats a Date object, timestamp (number), or ISO date string (YYYY-MM-DD)
 * into a standard YYYY-MM-DD string representation.
 * Returns an empty string if the input is invalid.
 * @param dateInput - The date to format (Date object, timestamp number, or 'YYYY-MM-DD' string).
 * @returns The formatted date string 'YYYY-MM-DD' or empty string on error.
 */
export const formatDateISO = (dateInput: number | string | Date): string => {
    try {
        let dateObj: Date;
        if (dateInput instanceof Date) dateObj = dateInput;
        else if (typeof dateInput === 'string') dateObj = parseISO(dateInput);
        else if (typeof dateInput === 'number') dateObj = new Date(dateInput);
        else throw new Error("Invalid input type");

        if (!isValid(dateObj)) throw new Error("Invalid date value");
        return formatISO(dateObj, { representation: 'date' });
    } catch (error) {
        console.error("Error in formatDateISO:", error, "Input:", dateInput);
        return "";
    }
};

/**
 * Asynchronously formats a Date object, timestamp (number), or ISO date string (YYYY-MM-DD)
 * into a human-readable format (e.g., "MMMM dd, yyyy") using the current app locale.
 * Returns 'Invalid Date' if the input is invalid.
 * @param dateInput - The date to format (Date object, timestamp number, or 'YYYY-MM-DD' string).
 * @returns The formatted readable date string or 'Invalid Date' on error.
 */
export const formatDateReadableAsync = async (dateInput: number | string | Date): Promise<string> => {
    try {
        let dateObj: Date;
        if (dateInput instanceof Date) dateObj = dateInput;
        else if (typeof dateInput === 'string') dateObj = parseISO(dateInput);
        else if (typeof dateInput === 'number') dateObj = new Date(dateInput);
        else throw new Error("Invalid input type");

        if (!isValid(dateObj)) throw new Error("Invalid date value");

        const locale = await getDateFnLocale(); // Get date-fns locale
        return format(dateObj, 'MMMM dd, yyyy', { locale });
    } catch (error) {
         console.error("Error in formatDateReadableAsync:", error, "Input:", dateInput);
         return 'Invalid Date'; // Fallback for display
    }
};

/**
 * Gets today's date as a standard YYYY-MM-DD string.
 * @returns Today's date in 'YYYY-MM-DD' format.
 */
export const getTodayDateString = (): string => {
  return formatISO(new Date(), { representation: 'date' });
};