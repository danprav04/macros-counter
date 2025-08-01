// __tests__/utils/macros.test.ts
import * as macrosUtil from '../../src/utils/macros';
import * as backendService from '../../src/services/backendService';
import { Alert } from 'react-native';

jest.mock('../../src/services/backendService');
jest.mock('../../src/utils/imageUtils', () => ({
    getBase64FromUri: jest.fn().mockResolvedValue('mock-base64-string'),
}));

const mockedBackend = backendService as jest.Mocked<typeof backendService>;

describe('macros utils', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getMacrosFromText', () => {
        it('should call the backend service and return macros', async () => {
            const mockResponse = {
                foodName: 'Scrambled Eggs',
                calories: 150,
                protein: 12,
                carbs: 1,
                fat: 11
            };
            mockedBackend.getMacrosForRecipe.mockResolvedValue(mockResponse);

            const result = await macrosUtil.getMacrosFromText('Scrambled Eggs', '2 eggs, 1 tbsp butter');

            expect(result).toEqual(mockResponse);
            expect(backendService.getMacrosForRecipe).toHaveBeenCalledWith('Scrambled Eggs', '2 eggs, 1 tbsp butter');
        });

        it('should handle backend errors and show an alert', async () => {
            const error = new backendService.BackendError('AI is sleeping', 503);
            mockedBackend.getMacrosForRecipe.mockRejectedValue(error);

            await expect(macrosUtil.getMacrosFromText('test', 'test')).rejects.toThrow('AI is sleeping');
            expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), 'AI is sleeping');
        });
    });

    describe('determineMimeType', () => {
        it('should return the mimeType if it exists', () => {
            const asset = { uri: 'file.jpg', mimeType: 'image/png' };
            expect(macrosUtil.determineMimeType(asset)).toBe('image/png');
        });

        it('should determine mimeType from uri extension', () => {
            expect(macrosUtil.determineMimeType({ uri: 'file.jpeg' })).toBe('image/jpeg');
            expect(macrosUtil.determineMimeType({ uri: 'file.png' })).toBe('image/png');
        });

        it('should default to image/jpeg for unknown extensions', () => {
            expect(macrosUtil.determineMimeType({ uri: 'file.webp' })).toBe('image/jpeg');
        });
    });
});