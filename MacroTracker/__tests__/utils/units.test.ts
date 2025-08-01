// __tests__/utils/units.test.ts
import { Alert } from 'react-native';
import { getGramsFromNaturalLanguage } from '../../src/utils/units';
import * as backendService from '../../src/services/backendService';

// Mock dependencies
jest.mock('../../src/services/backendService');
const mockedBackend = backendService as jest.Mocked<typeof backendService>;

describe('getGramsFromNaturalLanguage', () => {
    beforeEach(() => {
        // Clear mocks before each test
        (Alert.alert as jest.Mock).mockClear();
        mockedBackend.estimateGramsNaturalLanguage.mockClear();
    });

    it('should return the estimated grams on a successful API call', async () => {
        const mockGrams = 150;
        mockedBackend.estimateGramsNaturalLanguage.mockResolvedValue(mockGrams);

        const grams = await getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet');

        expect(grams).toBe(mockGrams);
        expect(mockedBackend.estimateGramsNaturalLanguage).toHaveBeenCalledWith('Chicken Breast', 'one medium fillet');
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should show an alert and re-throw a BackendError on failure', async () => {
        const errorMessage = 'Mocked backend error';
        const backendError = new backendService.BackendError(errorMessage, 500);
        mockedBackend.estimateGramsNaturalLanguage.mockRejectedValue(backendError);

        // We expect the function to throw, so we wrap it in a try/catch or use .rejects
        await expect(
            getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet')
        ).rejects.toThrow(errorMessage);

        // Verify that the alert was shown with the correct error message
        expect(Alert.alert).toHaveBeenCalledWith(
            expect.any(String), // Title
            errorMessage        // Message
        );
    });

    it('should handle non-BackendError failures gracefully', async () => {
        const genericError = new Error('Generic network failure');
        mockedBackend.estimateGramsNaturalLanguage.mockRejectedValue(genericError);

        // We expect the promise to reject
        await expect(
            getGramsFromNaturalLanguage('Chicken Breast', 'some amount')
        ).rejects.toThrow('Generic network failure');

        // And an alert should still be shown with a default message
        expect(Alert.alert).toHaveBeenCalledWith(
            expect.any(String), // Title
            expect.any(String)  // Default error message
        );
    });
});