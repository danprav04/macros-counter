// src/utils/imageUtils.ts
import * as ImageManipulator from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy'; // FIXED: Use legacy import
import * as FileSystemNext from 'expo-file-system'; 
import { t } from '../localization/i18n';

const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_COMPRESSION_QUALITY = 0.7;

export const compressImageIfNeeded = async (
    asset: ImagePickerAsset
): Promise<ImageManipulator.ImageResult | null> => {
    try {
        const actions: ImageManipulator.Action[] = [];
        let needsResize = false;
        if (asset.width > MAX_IMAGE_DIMENSION || asset.height > MAX_IMAGE_DIMENSION) {
            needsResize = true;
            const resizeOptions: ImageManipulator.ActionResize['resize'] = { width: undefined, height: undefined, };
            if (asset.width > asset.height) resizeOptions.width = MAX_IMAGE_DIMENSION;
            else resizeOptions.height = MAX_IMAGE_DIMENSION;
            actions.push({ resize: resizeOptions });
        } else {
            return null;
        }
        if (needsResize) {
            const saveOptions: ImageManipulator.SaveOptions = {
                compress: IMAGE_COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: false,
            };
            const result = await ImageManipulator.manipulateAsync(asset.uri, actions, saveOptions);
            return result;
        } else {
            return null;
        }
    } catch (error) {
        Alert.alert(t('utils.image.alertCompressionError'), t('utils.image.alertCompressionErrorMessage'));
        return null;
    }
};

export async function getBase64FromUri(uri: string): Promise<string> {
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, });
        return base64;
    } catch (error: any) {
        throw new Error(t('utils.image.errorFailedToRead', { error: error.message || 'Unknown error' }));
    }
}