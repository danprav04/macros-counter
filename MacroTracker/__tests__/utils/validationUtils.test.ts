// __tests__/utils/validationUtils.test.ts
import { isValidNumberInput, isNotEmpty } from '../../src/utils/validationUtils';

describe('validationUtils', () => {
  describe('isValidNumberInput', () => {
    // Test cases for valid number inputs
    it.each([
      ['123', true],
      ['0', true],
      ['123.45', true],
      ['0.5', true],
      ['.5', true],
      ['123.', true],
    ])('should return true for valid number string "%s"', (input, expected) => {
      expect(isValidNumberInput(input)).toBe(expected);
    });

    // Test cases for invalid number inputs
    it.each([
      ['', false],
      ['.', false],
      ['abc', false],
      ['12a', false],
      ['12.34.56', false],
      ['--123', false],
      ['1,234', false],
      [' ', false],
      [null, false],
      [undefined, false],
    ])('should return false for invalid number string "%s"', (input, expected) => {
      // @ts-ignore
      expect(isValidNumberInput(input)).toBe(expected);
    });
  });

  describe('isNotEmpty', () => {
    // Test cases for strings that are not empty
    it.each([
      ['a', true],
      [' a ', true],
      ['hello world', true],
      ['0', true],
    ])('should return true for non-empty string "%s"', (input, expected) => {
      expect(isNotEmpty(input)).toBe(expected);
    });

    // Test cases for strings that are empty or only contain whitespace
    it.each([
      ['', false],
      [' ', false],
      ['   ', false],
      [null, false],
      [undefined, false],
    ])('should return false for empty or whitespace-only string "%s"', (input, expected) => {
      // @ts-ignore
      expect(isNotEmpty(input)).toBe(expected);
    });
  });
});