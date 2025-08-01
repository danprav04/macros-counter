// __tests__/utils/languageUtils.test.ts
import { detectLanguageFromText } from '../../src/utils/languageUtils';

describe('detectLanguageFromText', () => {
  it('should return "en" for English text', () => {
    expect(detectLanguageFromText('Hello, world!')).toBe('en');
  });

  it('should return "ru" for Cyrillic text', () => {
    expect(detectLanguageFromText('Привет, мир!')).toBe('ru');
  });

  it('should return "he" for Hebrew text', () => {
    expect(detectLanguageFromText('שלום, עולם!')).toBe('he');
  });

  it('should handle empty or whitespace strings by defaulting to "en"', () => {
    expect(detectLanguageFromText('')).toBe('en');
    expect(detectLanguageFromText('   ')).toBe('en');
  });

  it('should handle mixed language strings, preferring non-Latin scripts', () => {
    // More Cyrillic chars
    expect(detectLanguageFromText('Пирог Apple Pie')).toBe('ru');
    // The presence of any Cyrillic char is enough to trigger 'ru'
    expect(detectLanguageFromText('Apple пирог')).toBe('ru');
  });

  it('should default to English for unhandled scripts or equal mixes', () => {
    expect(detectLanguageFromText('你好, 世界!')).toBe('en');
    expect(detectLanguageFromText('1234567890')).toBe('en');
  });
});