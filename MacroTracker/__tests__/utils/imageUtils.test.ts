// __tests__/utils/imageUtils.test.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { compressImageIfNeeded, getBase64FromUri } from 'utils/imageUtils';
import { ImagePickerAsset } from 'expo-image-picker';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('expo-image-manipulator');
jest.mock('expo-file-system');
jest.spyOn(Alert, 'alert');

const mockedManipulateAsync = ImageManipulator.manipulateAsync as jest.Mock;
const mockedReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;

describe('imageUtils', () => {

  describe('compressImageIfNeeded', () => {
    it('should not compress an image that is within size limits', async () => {
      const asset: ImagePickerAsset = { uri: 'file://test.jpg', width: 800, height: 600, type: 'image' };
      const result = await compressImageIfNeeded(asset);
      expect(result).toBeNull();
      expect(mockedManipulateAsync).not.toHaveBeenCalled();
    });

    it('should compress an image with width greater than max dimension', async () => {
      const asset: ImagePickerAsset = { uri: 'file://test.jpg', width: 2000, height: 1500, type: 'image' };
      mockedManipulateAsync.mockResolvedValue({ uri: 'file://compressed.jpg', width: 1024, height: 768 });
      
      const result = await compressImageIfNeeded(asset);
      
      expect(mockedManipulateAsync).toHaveBeenCalledWith(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );
      expect(result).not.toBeNull();
      expect(result?.uri).toBe('file://compressed.jpg');
    });

    it('should compress an image with height greater than max dimension', async () => {
        const asset: ImagePickerAsset = { uri: 'file://test.jpg', width: 1500, height: 2000, type: 'image' };
        mockedManipulateAsync.mockResolvedValue({ uri: 'file://compressed.jpg', width: 768, height: 1024 });
        
        const result = await compressImageIfNeeded(asset);

        expect(mockedManipulateAsync).toHaveBeenCalledWith(
            asset.uri,
            [{ resize: { height: 1024 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: false }
        );
        expect(result).not.toBeNull();
    });

    it('should return null and alert on compression error', async () => {
        const asset: ImagePickerAsset = { uri: 'file://test.jpg', width: 2000, height: 1500, type: 'image' };
        mockedManipulateAsync.mockRejectedValue(new Error('Manipulation failed'));

        const result = await compressImageIfNeeded(asset);
        expect(result).toBeNull();
        expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('getBase64FromUri', () => {
    it('should return base64 string on success', async () => {
        const uri = 'file://image.jpg';
        const base64String = 'base64encodedstring';
        mockedReadAsStringAsync.mockResolvedValue(base64String);

        const result = await getBase64FromUri(uri);
        
        expect(result).toBe(base64String);
        expect(mockedReadAsStringAsync).toHaveBeenCalledWith(uri, { encoding: FileSystem.EncodingType.Base64 });
    });

    it('should throw an error if file system read fails', async () => {
        const uri = 'file://nonexistent.jpg';
        mockedReadAsStringAsync.mockRejectedValue(new Error('File not found'));

        await expect(getBase64FromUri(uri)).rejects.toThrow();
    });
  });
});