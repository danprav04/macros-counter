// __tests__/utils/dateUtils.test.ts
import { formatDateISO, formatDateReadableAsync, getTodayDateString } from '../../src/utils/dateUtils';
import { getDateFnLocale } from '../../src/localization/i18n';
import { enUS, ru } from 'date-fns/locale';
import { mocked } from 'jest-mock';

// Mock the i18n module to control the date locale for tests
jest.mock('../../src/localization/i18n', () => ({
  ...jest.requireActual('../../src/localization/i18n'),
  getDateFnLocale: jest.fn(),
}));

// Typecast the mock for TypeScript
const mockedGetDateFnLocale = mocked(getDateFnLocale);

describe('dateUtils', () => {
  const testDate = new Date(2024, 9, 31, 15, 0, 0); // October 31, 2024
  const testISOString = '2024-10-31';
  const testTimestamp = testDate.getTime();
  let errorSpy: jest.SpyInstance;

  // Suppress expected console.error messages from our tests
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Restore console.error after each test
  afterEach(() => {
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('formatDateISO', () => {
    it('should format a Date object correctly', () => {
      expect(formatDateISO(testDate)).toBe(testISOString);
    });

    it('should format a timestamp correctly', () => {
      expect(formatDateISO(testTimestamp)).toBe(testISOString);
    });

    it('should format an ISO string correctly', () => {
      expect(formatDateISO('2024-10-31T12:00:00.000Z')).toBe(testISOString);
    });

    it('should return an empty string for an invalid date string', () => {
      expect(formatDateISO('not a date')).toBe('');
      expect(errorSpy).toHaveBeenCalled(); // Verify error was logged
    });

    it('should return an empty string for an invalid input type', () => {
      // @ts-ignore
      expect(formatDateISO(null)).toBe('');
      // @ts-ignore
      expect(formatDateISO(undefined)).toBe('');
      // @ts-ignore
      expect(formatDateISO({})).toBe('');
      expect(errorSpy).toHaveBeenCalledTimes(3); // Verify error was logged for each
    });
  });

  describe('formatDateReadableAsync', () => {
    it('should format a date in English when locale is en-US', async () => {
      mockedGetDateFnLocale.mockResolvedValue(enUS);
      const formattedDate = await formatDateReadableAsync(testDate);
      expect(formattedDate).toBe('October 31, 2024');
      expect(mockedGetDateFnLocale).toHaveBeenCalled();
    });

    it('should format a date in Russian when locale is ru', async () => {
      mockedGetDateFnLocale.mockResolvedValue(ru);
      const formattedDate = await formatDateReadableAsync(testDate);
      // This format is specific to date-fns's implementation for 'MMMM dd, yyyy'
      expect(formattedDate).toBe('октября 31, 2024');
      expect(mockedGetDateFnLocale).toHaveBeenCalled();
    });

    it('should handle timestamp input', async () => {
      mockedGetDateFnLocale.mockResolvedValue(enUS);
      const formattedDate = await formatDateReadableAsync(testTimestamp);
      expect(formattedDate).toBe('October 31, 2024');
    });

    it('should handle ISO string input', async () => {
        mockedGetDateFnLocale.mockResolvedValue(enUS);
        const formattedDate = await formatDateReadableAsync(testISOString);
        expect(formattedDate).toBe('October 31, 2024');
      });

    it('should return "Invalid Date" for invalid string input', async () => {
      const formattedDate = await formatDateReadableAsync('not a real date');
      expect(formattedDate).toBe('Invalid Date');
      expect(errorSpy).toHaveBeenCalled(); // Verify error was logged
    });

    it('should return "Invalid Date" for invalid input types', async () => {
        // @ts-ignore
        expect(await formatDateReadableAsync(null)).toBe('Invalid Date');
        // @ts-ignore
        expect(await formatDateReadableAsync(undefined)).toBe('Invalid Date');
        expect(errorSpy).toHaveBeenCalledTimes(2); // Verify error was logged
      });
  });

  describe('getTodayDateString', () => {
    const MOCK_DATE = new Date(2025, 0, 15); // January 15, 2025

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(MOCK_DATE);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should return the current date in YYYY-MM-DD format', () => {
      const todayString = getTodayDateString();
      expect(todayString).toBe('2025-01-15');
    });
  });
});