// __tests__/utils/languageUtils.test.ts
import { detectLanguageFromText } from 'utils/languageUtils';

describe('detectLanguageFromText', () => {
  it('should detect English (Latin script) correctly', () => {
    expect(detectLanguageFromText('Chicken Breast')).toBe('en');
    expect(detectLanguageFromText('Apple Pie')).toBe('en');
    expect(detectLanguageFromText('A simple text')).toBe('en');
  });

  it('should detect Russian (Cyrillic script) correctly', () => {
    expect(detectLanguageFromText('Куриная грудка')).toBe('ru');
    expect(detectLanguageFromText('Яблочный пирог')).toBe('ru');
    expect(detectLanguageFromText('Простой текст')).toBe('ru');
  });

  it('should detect Hebrew (Hebrew script) correctly', () => {
    expect(detectLanguageFromText('חזה עוף')).toBe('he');
    expect(detectLanguageFromText('פאי תפוחים')).toBe('he');
    expect(detectLanguageFromText('טקסט פשוט')).toBe('he');
  });

  it('should handle mixed language strings, preferring non-Latin scripts', () => {
    // More Hebrew chars
    expect(detectLanguageFromText('פאי Apple Pie')).toBe('he');
    // More Cyrillic chars
    expect(detectLanguageFromText('Пирог Apple Pie')).toBe('ru');
    // More English chars
    expect(detectLanguageFromText('Apple пирог')).toBe('en');
  });

  it('should default to English for unhandled scripts or equal mixes', () => {
    expect(detectLanguageFromText('你好世界')).toBe('en'); // Chinese
    expect(detectLanguageFromText('こんにちは')).toBe('en'); // Japanese
    expect(detectLanguageFromText('Ру פאי')).toBe('he'); // hebrew has priority over russian
  });

  it('should handle empty or whitespace strings', () => {
    expect(detectLanguageFromText('')).toBe('en');
    expect(detectLanguageFromText('   ')).toBe('en');
  });

  it('should handle strings with numbers and symbols', () => {
    expect(detectLanguageFromText('Chicken Breast 100g')).toBe('en');
    expect(detectLanguageFromText('Курица 100г')).toBe('ru');
    expect(detectLanguageFromText('חזה עוף 100 גרם')).toBe('he');
    expect(detectLanguageFromText('12345 !@#$%')).toBe('en');
  });
});