// __tests__/utils/units.test.ts
import { Alert } from 'react-native';
import { getGramsFromNaturalLanguage } from '../../src/utils/units';
import { estimateGramsNaturalLanguage, BackendError } from '../../src/services/backendService';
import { t } from '../../src/localization/i18n';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));
jest.mock('../../src/services/backendService');

const mockedEstimateGrams = estimateGramsNaturalLanguage as jest.Mock;

describe('getGramsFromNaturalLanguage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the correct number of grams on success', async () => {
    mockedEstimateGrams.mockResolvedValue(150);
    const grams = await getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet');
    expect(grams).toBe(150);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('should show an alert and re-throw a BackendError on failure', async () => {
    const error = new BackendError('AI unavailable', 503);
    mockedEstimateGrams.mockRejectedValue(error);

    await expect(getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet')).rejects.toThrow(error);

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String), // title
      'AI unavailable'   // message
    );
  });

  it('should show a generic alert for non-BackendError failures', async () => {
    const genericError = new Error('Something went wrong');
    mockedEstimateGrams.mockRejectedValue(genericError);
    const expectedMessage = t('errors.unexpectedError');

    await expect(getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet')).rejects.toThrow(genericError);

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String), // title
      expectedMessage
    );
  });
});