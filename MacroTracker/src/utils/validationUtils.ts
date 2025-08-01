// utils/validationUtils.ts

export const isValidNumberInput = (value: string): boolean => {
    if (typeof value !== 'string') return false;
    return /^[0-9]*(\.[0-9]*)?$/.test(value) && !isNaN(parseFloat(value));
  };
  
  export const isNotEmpty = (value: string): boolean => {
    return typeof value === 'string' && value.trim() !== '';
  };