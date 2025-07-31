// __tests__/utils/iconUtils.test.ts
import { getFoodIconUrl, clearLocalIconCache } from 'utils/iconUtils';
import * as foodIconMatcher from 'utils/foodIconMatcher';
import * as languageUtils from 'utils/languageUtils';

// Mock the dependencies
jest.mock('utils/foodIconMatcher');
jest.mock('utils/languageUtils');

const mockedFindBestIcon = foodIconMatcher.findBestIcon as jest.Mock;
const mockedDetectLanguage = languageUtils.detectLanguageFromText as jest.Mock;

describe('getFoodIconUrl', () => {
  beforeEach(() => {
    // Clear mocks and cache before each test
    mockedFindBestIcon.mockClear();
    mockedDetectLanguage.mockClear();
    clearLocalIconCache();
  });

  it('should return null for empty food name', () => {
    expect(getFoodIconUrl('')).toBeNull();
    expect(getFoodIconUrl('  ')).toBeNull();
    expect(mockedDetectLanguage).not.toHaveBeenCalled();
    expect(mockedFindBestIcon).not.toHaveBeenCalled();
  });

  it('should call language detection and icon matcher for a new food name', () => {
    mockedDetectLanguage.mockReturnValue('en');
    mockedFindBestIcon.mockReturnValue('🍎');

    const icon = getFoodIconUrl('Apple');

    expect(icon).toBe('🍎');
    expect(mockedDetectLanguage).toHaveBeenCalledWith('Apple');
    expect(mockedFindBestIcon).toHaveBeenCalledWith('Apple', 'en');
  });

  it('should use the cache for subsequent calls with the same food name', () => {
    mockedDetectLanguage.mockReturnValue('en');
    mockedFindBestIcon.mockReturnValue('🍎');

    // First call - should call the mocks
    getFoodIconUrl('Apple');
    expect(mockedDetectLanguage).toHaveBeenCalledTimes(1);
    expect(mockedFindBestIcon).toHaveBeenCalledTimes(1);
    
    // Second call - should hit the cache
    const icon = getFoodIconUrl('Apple');
    expect(icon).toBe('🍎');
    expect(mockedDetectLanguage).toHaveBeenCalledTimes(1); // Should not be called again
    expect(mockedFindBestIcon).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should create a different cache entry for different locales', () => {
    // First call in English
    mockedDetectLanguage.mockReturnValue('en');
    mockedFindBestIcon.mockReturnValue('🍗');
    getFoodIconUrl('Chicken');
    
    // Second call for a food name detected as Russian
    mockedDetectLanguage.mockReturnValue('ru');
    mockedFindBestIcon.mockReturnValue('🐔'); // Let's pretend it's a different icon
    const icon = getFoodIconUrl('Курица');

    expect(icon).toBe('🐔');
    expect(mockedDetectLanguage).toHaveBeenCalledWith('Chicken');
    expect(mockedDetectLanguage).toHaveBeenCalledWith('Курица');
    expect(mockedDetectLanguage).toHaveBeenCalledTimes(2);
    expect(mockedFindBestIcon).toHaveBeenCalledTimes(2);
  });

  it('should normalize food names for caching', () => {
    mockedDetectLanguage.mockReturnValue('en');
    mockedFindBestIcon.mockReturnValue('🍎');

    getFoodIconUrl('  Apple  '); // First call with extra spaces
    expect(mockedDetectLanguage).toHaveBeenCalledTimes(1);
    expect(mockedFindBestIcon).toHaveBeenCalledTimes(1);

    const icon = getFoodIconUrl('apple'); // Second call, normalized
    expect(icon).toBe('🍎');
    // Should not call mocks again because 'apple' is the normalized version of '  Apple  '
    expect(mockedDetectLanguage).toHaveBeenCalledTimes(1);
    expect(mockedFindBestIcon).toHaveBeenCalledTimes(1);
  });
});