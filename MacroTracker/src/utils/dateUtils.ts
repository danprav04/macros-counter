// utils/dateUtils.ts (Corrected type for formatDateReadable)
import { format, parseISO, formatISO, isValid } from 'date-fns';

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
        if (dateInput instanceof Date) {
            dateObj = dateInput;
        } else if (typeof dateInput === 'string') {
            // Assume 'YYYY-MM-DD' format if string
            dateObj = parseISO(dateInput);
        } else if (typeof dateInput === 'number') {
            // Assume timestamp if number
            dateObj = new Date(dateInput);
        } else {
            throw new Error("Invalid input type");
        }

        if (!isValid(dateObj)) {
             throw new Error("Invalid date value");
        }
        return formatISO(dateObj, { representation: 'date' });
    } catch (error) {
        console.error("Error in formatDateISO:", error, "Input:", dateInput);
        return ""; // Return empty string on error
    }
};


/**
 * Formats a Date object, timestamp (number), or ISO date string (YYYY-MM-DD)
 * into a human-readable format (e.g., "MMMM dd, yyyy").
 * Returns 'Invalid Date' if the input is invalid.
 * @param dateInput - The date to format (Date object, timestamp number, or 'YYYY-MM-DD' string).
 * @returns The formatted readable date string or 'Invalid Date' on error.
 */
export const formatDateReadable = (dateInput: number | string | Date): string => {
    try {
        let dateObj: Date;
        if (dateInput instanceof Date) {
            dateObj = dateInput;
        } else if (typeof dateInput === 'string') {
            // Assume 'YYYY-MM-DD' format if string
            dateObj = parseISO(dateInput);
        } else if (typeof dateInput === 'number') {
             // Assume timestamp if number
            dateObj = new Date(dateInput);
        } else {
             throw new Error("Invalid input type");
        }

        if (!isValid(dateObj)) {
            throw new Error("Invalid date value");
        }
        return format(dateObj, 'MMMM dd, yyyy'); // Example format
    } catch (error) {
         console.error("Error in formatDateReadable:", error, "Input:", dateInput);
         return 'Invalid Date'; // Return indicator string on error
    }
};

/**
 * Gets today's date as a standard YYYY-MM-DD string.
 * @returns Today's date in 'YYYY-MM-DD' format.
 */
export const getTodayDateString = (): string => {
  // formatISO handles Date object correctly
  return formatISO(new Date(), { representation: 'date' });
};