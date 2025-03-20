// utils/dateUtils.ts
import { format, parseISO } from 'date-fns';

export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = parseISO(date);
  }
  return format(date, 'yyyy-MM-dd');
};

export const formatDateReadable = (date: Date | string): string => {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    return format(date, 'MMMM dd, yyyy');
}

export const getTodayDateString = (): string => {
  return formatDate(new Date());
};