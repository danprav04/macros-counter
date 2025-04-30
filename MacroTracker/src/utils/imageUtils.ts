import * as ImageManipulator from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

const MAX_IMAGE_DIMENSION = 1024; // Max width/height for compressed image
const IMAGE_COMPRESSION_QUALITY = 0.7; // Compression quality (0.0 - 1.0)

/**
 * Compresses an image asset if its dimensions exceed the maximum allowed.
 * @param asset The original ImagePickerAsset.
 * @returns A promise resolving to the compressed ImageManipulator.ImageResult or null if compression fails/is unnecessary.
 */
export const compressImageIfNeeded = async (
    asset: ImagePickerAsset
): Promise<ImageManipulator.ImageResult | null> => {
    console.log(`Compress Check: Original image dimensions: ${asset.width}x${asset.height}`);
    try {
        const actions: ImageManipulator.Action[] = [];
        let needsResize = false;

        // Determine target dimensions based on MAX_IMAGE_DIMENSION
        if (asset.width > MAX_IMAGE_DIMENSION || asset.height > MAX_IMAGE_DIMENSION) {
            needsResize = true;
            const resizeOptions: ImageManipulator.ActionResize['resize'] = { // Access nested type
                width: undefined,
                height: undefined,
            };
            if (asset.width > asset.height) {
                resizeOptions.width = MAX_IMAGE_DIMENSION;
            } else {
                resizeOptions.height = MAX_IMAGE_DIMENSION;
            }
            // Add the resize action object correctly structured
            actions.push({ resize: resizeOptions });
            console.log(`Compress Check: Resizing image to max dimension ${MAX_IMAGE_DIMENSION}`);
        } else {
            console.log(`Compress Check: Image dimensions within limits, no resize needed.`);
            // If no resize is needed, we might not need to manipulate at all,
            // unless we always want to ensure JPEG format and quality.
            // For simplicity now, return null if no resize is performed.
            // If always ensuring format/quality is desired, remove this return.
            return null; // Indicate no compression was performed
        }

        // Only proceed with manipulation if resize was necessary
        if (needsResize) {
            const saveOptions: ImageManipulator.SaveOptions = {
                compress: IMAGE_COMPRESSION_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG, // Standardize format
                base64: false, // Base64 is handled separately
            };

            const result = await ImageManipulator.manipulateAsync(asset.uri, actions, saveOptions);
            console.log(`Compress Check: Compressed image dimensions: ${result.width}x${result.height}`);
            console.log(`Compress Check: Compressed image URI: ${result.uri}`);
            return result;
        } else {
            return null; // No manipulation was performed
        }

    } catch (error) {
        console.error("Compress Check: Failed to compress image:", error);
        Alert.alert("Compression Error", "Could not process the image for compression.");
        return null; // Return null if compression fails
    }
};


/**
 * Converts a file URI to a base64 string. Includes error handling.
 * @param uri The file URI to read.
 * @returns A promise resolving to the base64 encoded string.
 * @throws An error if reading the file fails.
 */
export async function getBase64FromUri(uri: string): Promise<string> {
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
    } catch (error: any) {
        console.error(`getBase64FromUri: Failed to read file as base64: ${uri}`, error);
        // Provide a more specific error message to the caller
        throw new Error(`Failed to read image file: ${error.message || 'Unknown error'}`);
    }
}