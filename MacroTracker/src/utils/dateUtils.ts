// utils/dateUtils.ts (Modified)
import { format, parseISO, formatISO } from 'date-fns';

// Format a timestamp as YYYY-MM-DD (for display and storage)
export const formatDate = (timestamp: number): string => {
    return formatISO(timestamp, { representation: 'date' });
};

// Format a timestamp as a readable date (for display)
export const formatDateReadable = (timestamp: number | string): string => {
    if (typeof timestamp === 'string') {
        return timestamp; // if it is a string, do nothing.
    }
  return format(timestamp, 'MMMM dd, yyyy');
};

// Get today's date as a timestamp
export const getTodayDateString = (): string => {
  return formatISO(new Date(), { representation: 'date' });
};