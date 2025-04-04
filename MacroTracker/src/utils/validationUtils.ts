// utils/validationUtils.ts

export const isValidNumberInput = (value: string): boolean => {
    return /^[0-9]*(\.[0-9]*)?$/.test(value) && !isNaN(parseFloat(value));
  };
  
  export const isNotEmpty = (value: string): boolean => {
    return value.trim() !== '';
  };