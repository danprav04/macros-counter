// __tests__/utils/macros.test.ts
import { Alert } from 'react-native';
import {
  getMacrosFromText,
  getMacrosForImageFile,
  getMultipleFoodsFromImage,
  getMultipleFoodsFromText,
  determineMimeType,
  BackendError,
} from '../../src/utils/macros';
import * as backendService from '../../src/services/backendService';
import * as imageUtils from '../../src/utils/imageUtils';
import { ImagePickerAsset } from 'expo-image-picker';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));
jest.mock('../../src/services/backendService');
jest.mock('../../src/utils/imageUtils');

const mockedGetMacrosForRecipe = backendService.getMacrosForRecipe as jest.Mock;
const mockedGetMacrosForImageSingle = backendService.getMacrosForImageSingle as jest.Mock;
const mockedGetMacrosForImageMultiple = backendService.getMacrosForImageMultiple as jest.Mock;
const mockedGetMacrosForTextMultiple = backendService.getMacrosForTextMultiple as jest.Mock;
const mockedGetBase64FromUri = imageUtils.getBase64FromUri as jest.Mock;

describe('macros utils', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineMimeType', () => {
    it('returns the mimeType if it exists', () => {
      expect(determineMimeType({ uri: 'file.jpg', mimeType: 'image/jpeg' })).toBe('image/jpeg');
    });
    it('infers mimeType from uri extension', () => {
      expect(determineMimeType({ uri: 'file.png' })).toBe('image/png');
      expect(determineMimeType({ uri: 'file.JPG' })).toBe('image/jpeg');
    });
    it('defaults to image/jpeg for unknown extensions', () => {
      expect(determineMimeType({ uri: 'file.webp' })).toBe('image/jpeg');
    });
  });

  describe('getMacrosFromText', () => {
    it('should return macros on success', async () => {
      const mockResponse = { foodName: 'a', calories: 1, protein: 2, carbs: 3, fat: 4 };
      mockedGetMacrosForRecipe.mockResolvedValue(mockResponse);
      const result = await getMacrosFromText('a', 'b');
      expect(result).toEqual(mockResponse);
    });

    it('should show an alert and re-throw on failure', async () => {
      const error = new BackendError('AI unavailable', 503);
      mockedGetMacrosForRecipe.mockRejectedValue(error);

      await expect(getMacrosFromText('a', 'b')).rejects.toThrow(error);
      expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), 'AI unavailable');
    });
  });

  describe('getMacrosForImageFile', () => {
    const asset: ImagePickerAsset = {
      uri: 'file://test.jpg',
      width: 100,
      height: 100,
      assetId: '1',
      type: 'image',
    };

    it('should return macros on success', async () => {
      mockedGetBase64FromUri.mockResolvedValue('base64string');
      const mockResponse = { foodName: 'a', calories: 1, protein: 2, carbs: 3, fat: 4 };
      mockedGetMacrosForImageSingle.mockResolvedValue(mockResponse);

      const result = await getMacrosForImageFile(asset);
      expect(result).toEqual(mockResponse);
      expect(mockedGetBase64FromUri).toHaveBeenCalledWith(asset.uri);
      expect(mockedGetMacrosForImageSingle).toHaveBeenCalledWith('base64string', 'image/jpeg');
    });

    it('should show an alert and re-throw on failure', async () => {
        const error = new BackendError('Analysis failed', 500);
        mockedGetBase64FromUri.mockResolvedValue('base64string');
        mockedGetMacrosForImageSingle.mockRejectedValue(error);
        
        await expect(getMacrosForImageFile(asset)).rejects.toThrow(error);
        expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('getMultipleFoodsFromImage', () => {
     it('should return an array of items on success', async () => {
         const mockItems = [{ foodName: 'Apple', estimatedWeightGrams: 150 }];
         mockedGetMacrosForImageMultiple.mockResolvedValue(mockItems);
         const result = await getMultipleFoodsFromImage('base64', 'image/png');
         expect(result).toEqual(mockItems);
     });

     it('should throw if the response is not an array', async () => {
        mockedGetMacrosForImageMultiple.mockResolvedValue({ not: 'an array' } as any);
        await expect(getMultipleFoodsFromImage('base64', 'image/png')).rejects.toThrow();
     });
  });

  describe('getMultipleFoodsFromText', () => {
      it('should return an array of items on success', async () => {
          const mockItems = [{ foodName: 'Chicken Salad', estimatedWeightGrams: 250 }];
          mockedGetMacrosForTextMultiple.mockResolvedValue(mockItems);
          const result = await getMultipleFoodsFromText('a chicken salad');
          expect(result).toEqual(mockItems);
      });
  });
});