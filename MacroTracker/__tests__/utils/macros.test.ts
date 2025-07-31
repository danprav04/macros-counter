// __tests__/utils/macros.test.ts
import { determineMimeType, getMacrosFromText, getMacrosForImageFile, getMultipleFoodsFromImage, getMultipleFoodsFromText } from 'utils/macros';
import * as backendService from 'services/backendService';
import * as imageUtils from 'utils/imageUtils';
import { Alert } from 'react-native';
import { ImagePickerAsset } from 'expo-image-picker';

jest.mock('services/backendService');
jest.mock('utils/imageUtils');
jest.spyOn(Alert, 'alert');

const mockedGetMacrosForRecipe = backendService.getMacrosForRecipe as jest.Mock;
const mockedGetMacrosForImageSingle = backendService.getMacrosForImageSingle as jest.Mock;
const mockedGetMultipleFoodsFromImage = backendService.getMacrosForImageMultiple as jest.Mock;
const mockedGetMultipleFoodsFromText = backendService.getMacrosForTextMultiple as jest.Mock;
const mockedGetBase64FromUri = imageUtils.getBase64FromUri as jest.Mock;

describe('macros utils', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('determineMimeType', () => {
    it('should return mimeType if it exists', () => {
      const asset = { uri: 'file.jpg', mimeType: 'image/png' };
      expect(determineMimeType(asset)).toBe('image/png');
    });

    it('should infer mimeType from uri extension', () => {
      expect(determineMimeType({ uri: 'file.jpeg' })).toBe('image/jpeg');
      expect(determineMimeType({ uri: 'file.png' })).toBe('image/png');
    });

    it('should default to image/jpeg for unknown extensions', () => {
      expect(determineMimeType({ uri: 'file.webp' })).toBe('image/jpeg');
    });
  });

  describe('getMacrosFromText', () => {
    it('should call backendService and return data on success', async () => {
      const mockResponse = { foodName: 'Chicken Salad', calories: 300, protein: 30, carbs: 10, fat: 15 };
      mockedGetMacrosForRecipe.mockResolvedValue(mockResponse);
      
      const result = await getMacrosFromText('Chicken Salad', '150g chicken, lettuce, tomato');
      
      expect(result).toEqual(mockResponse);
      expect(backendService.getMacrosForRecipe).toHaveBeenCalledWith('Chicken Salad', '150g chicken, lettuce, tomato');
    });

    it('should show an alert and re-throw on failure', async () => {
      const error = new backendService.BackendError('AI unavailable', 503);
      mockedGetMacrosForRecipe.mockRejectedValue(error);

      await expect(getMacrosFromText('a', 'b')).rejects.toThrow(error);
      expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), 'AI unavailable');
    });
  });

  describe('getMacrosForImageFile', () => {
    const asset: ImagePickerAsset = { uri: 'file.jpg', width: 100, height: 100, type: 'image' };

    it('should process image and return macros on success', async () => {
      mockedGetBase64FromUri.mockResolvedValue('base64string');
      const mockResponse = { foodName: 'Pizza', calories: 285, protein: 12, carbs: 36, fat: 10 };
      mockedGetMacrosForImageSingle.mockResolvedValue(mockResponse);
      
      const result = await getMacrosForImageFile(asset);

      expect(result).toEqual(mockResponse);
      expect(imageUtils.getBase64FromUri).toHaveBeenCalledWith(asset.uri);
      expect(backendService.getMacrosForImageSingle).toHaveBeenCalledWith('base64string', 'image/jpeg');
    });
    
    it('should show an alert and re-throw on failure', async () => {
        const error = new backendService.BackendError('Bad image data', 400);
        mockedGetMacrosForImageSingle.mockRejectedValue(error);

        await expect(getMacrosForImageFile(asset)).rejects.toThrow(error);
        expect(Alert.alert).toHaveBeenCalled();
    });
  });
  
  describe('getMultipleFoodsFromImage', () => {
     it('should return an array of estimated items on success', async () => {
       const mockResponse = [{ foodName: 'Apple', estimatedWeightGrams: 150, calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2 }];
       mockedGetMultipleFoodsFromImage.mockResolvedValue(mockResponse);
       
       const result = await getMultipleFoodsFromImage('base64string', 'image/jpeg');
       
       expect(result).toEqual(mockResponse);
       expect(backendService.getMacrosForImageMultiple).toHaveBeenCalledWith('base64string', 'image/jpeg');
     });
     
     it('should throw if the response is not an array', async () => {
        mockedGetMultipleFoodsFromImage.mockResolvedValue({ not: 'an array' });
        await expect(getMultipleFoodsFromImage('base64', 'image/jpeg')).rejects.toThrow();
        expect(Alert.alert).toHaveBeenCalled();
     });
  });

  describe('getMultipleFoodsFromText', () => {
     it('should return an array of estimated items on success', async () => {
       const mockResponse = [{ foodName: 'Rice', estimatedWeightGrams: 200, calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3 }];
       mockedGetMultipleFoodsFromText.mockResolvedValue(mockResponse);
       
       const result = await getMultipleFoodsFromText('a bowl of rice');
       
       expect(result).toEqual(mockResponse);
       expect(backendService.getMacrosForTextMultiple).toHaveBeenCalledWith('a bowl of rice');
     });

     it('should throw if the response is not an array', async () => {
        mockedGetMultipleFoodsFromText.mockResolvedValue('a string');
        await expect(getMultipleFoodsFromText('some text')).rejects.toThrow();
        expect(Alert.alert).toHaveBeenCalled();
     });
  });
});