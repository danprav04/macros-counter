// __tests__/utils/units.test.ts
import { getGramsFromNaturalLanguage } from 'utils/units';
import * as backendService from 'services/backendService';
import { Alert } from 'react-native';

jest.mock('services/backendService');
jest.spyOn(Alert, 'alert');

const mockedEstimateGrams = backendService.estimateGramsNaturalLanguage as jest.Mock;

describe('getGramsFromNaturalLanguage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the backend service and return the estimated grams', async () => {
    mockedEstimateGrams.mockResolvedValue(150);

    const grams = await getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet');

    expect(grams).toBe(150);
    expect(mockedEstimateGrams).toHaveBeenCalledWith('Chicken Breast', 'one medium fillet');
  });

  it('should show an alert and re-throw a BackendError on failure', async () => {
    const error = new backendService.BackendError('Estimation service unavailable', 503);
    mockedEstimateGrams.mockRejectedValue(error);

    await expect(getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet')).rejects.toThrow(error);
    
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String), // title
      'Estimation service unavailable' // message
    );
  });
  
  it('should show an alert and re-throw a generic error', async () => {
    const error = new Error('Network failed');
    mockedEstimateGrams.mockRejectedValue(error);
    
    await expect(getGramsFromNaturalLanguage('a', 'b')).rejects.toThrow(error);
    
    expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('An unexpected error occurred')
    );
  });
});