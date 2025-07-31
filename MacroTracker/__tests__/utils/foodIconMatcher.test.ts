// __tests__/utils/foodIconMatcher.test.ts
import { findBestIcon } from 'utils/foodIconMatcher';
import i18n from 'localization/i18n';

// We rely on the i18n instance which is loaded with en, he, ru JSONs.
// No need to mock t() itself, just ensure the locale is set for tests.

describe('findBestIcon', () => {

  beforeEach(() => {
    // Reset to a known locale before each test
    i18n.locale = 'en';
  });

  it('should find a perfect match for "apple" in English', () => {
    expect(findBestIcon('apple', 'en')).toBe('🍎');
  });

  it('should find a perfect match for "яблоко" in Russian', () => {
    // Set the i18n locale to Russian so it can find the tags
    i18n.locale = 'ru';
    expect(findBestIcon('яблоко', 'ru')).toBe('🍎');
  });
  
  it('should find a perfect match for "תפוח" in Hebrew', () => {
    i18n.locale = 'he';
    expect(findBestIcon('תפוח', 'he')).toBe('🍎');
  });

  it('should find an icon for a partial match like "chicken breast"', () => {
    expect(findBestIcon('chicken breast', 'en')).toBe('🍗');
  });

  it('should handle plural forms like "apples"', () => {
    expect(findBestIcon('apples', 'en')).toBe('🍎');
  });

  it('should handle case insensitivity', () => {
    expect(findBestIcon('ChIcKeN BrEaSt', 'en')).toBe('🍗');
  });

  it('should handle extra words and characters', () => {
    expect(findBestIcon('100g of cooked chicken breast', 'en')).toBe('🍗');
    expect(findBestIcon('apple (red)', 'en')).toBe('🍎');
  });

  it('should use priority to resolve conflicts (bell pepper vs general pepper)', () => {
    // "bell pepper" is more specific and has higher priority (11 vs 10)
    expect(findBestIcon('bell pepper', 'en')).toBe('🫑');
    // "chili pepper" should fall back to the general pepper
    expect(findBestIcon('chili pepper', 'en')).toBe('🌶️');
  });

  it('should return a generic meal icon for a complex dish name', () => {
    expect(findBestIcon('My amazing lunch plate', 'en')).toBe('🍽️');
  });
  
  it('should return the unknown icon for a completely unrelated term', () => {
    expect(findBestIcon('a brick wall', 'en')).toBe('❓');
  });

  it('should return null for an empty string', () => {
    expect(findBestIcon('', 'en')).toBeNull();
  });

  it('should use English fallback if a tag does not exist in the detected language', () => {
    // Let's pretend 'bacon' tag only exists in English json
    // The language of the food name itself is Russian
    expect(findBestIcon('бекон', 'ru')).toBe('🥓'); 
  });

  it('should correctly identify a Hebrew food using Hebrew tags', () => {
    i18n.locale = 'he';
    // 'סטייק' is in the 'redMeat' tag list in he.json
    expect(findBestIcon('סטייק אנטריקוט', 'he')).toBe('🥩');
  });
});