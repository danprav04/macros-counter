// __tests__/utils/units.test.ts

import { Alert } from 'react-native';
import { getGramsFromNaturalLanguage } from '../../src/utils/units';
import * as backendService from '../../src/services/backendService';

// Mock dependencies
jest.mock('../../src/services/backendService');
jest.mock('react-native', () => ({
    ...jest.requireActual('react-native'),
    Alert: {
        alert: jest.fn(),
    },
}));

// Type assertion for the mocked module
const mockedBackend = backendService as jest.Mocked<typeof backendService>;

describe('getGramsFromNaturalLanguage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
        const error = new mockedBackend.BackendError(errorMessage, 500);
        mockedBackend.estimateGramsNaturalLanguage.mockRejectedValue(error);

        // Assert that the promise rejects with an error containing the expected message
        await expect(
            getGramsFromNaturalLanguage('Chicken Breast', 'one medium fillet')
        ).rejects.toThrow(errorMessage);
        
        // Verify that the alert was shown with the correct error message
        expect(Alert.alert).toHaveBeenCalledWith(
            expect.any(String), // Title
            errorMessage      // Message
        );
    });

    it('should handle non-BackendError failures gracefully', async () => {
        const genericError = new Error('Network failed');
        mockedBackend.estimateGramsNaturalLanguage.mockRejectedValue(genericError);

        // Expect the original error to be re-thrown
        await expect(
            getGramsFromNaturalLanguage('Some Food', 'some amount')
        ).rejects.toThrow('Network failed');

        // And an alert should still be shown with a default message
        expect(Alert.alert).toHaveBeenCalledWith(
            expect.any(String), // Title
            expect.any(String)  // Default error message
        );
    });
});