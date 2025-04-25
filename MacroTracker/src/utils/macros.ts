// src/utils/macros.ts
import * as FileSystem from 'expo-file-system';
// import MimeTypes from 'react-native-mime-types'; // Optional: for more robust MIME type detection
import {
    getMacrosForRecipe,
    getMacrosForImageSingle,
    getMacrosForImageMultiple,
    BackendError // Re-export for components if needed
} from '../services/backendService';
import { Alert } from 'react-native';
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { ImagePickerAsset } from 'expo-image-picker';

// --- Helper function to determine MIME type (more robust) ---
function determineMimeType(asset: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    // Removed 'type' as it's less reliable than mimeType or extension
}): string {
    // 1. Prioritize asset.mimeType if available (most reliable)
    if (asset.mimeType && asset.mimeType.includes('/')) { // Basic validation
        console.log(`Using provided MIME type: ${asset.mimeType}`);
        return asset.mimeType;
    }

    // 2. Optional: Use react-native-mime-types if installed
    // const validFileNameForLookup = asset.fileName ?? undefined;
    // if (validFileNameForLookup) {
    //     const lookedUpMime = MimeTypes.lookup(validFileNameForLookup);
    //     if (lookedUpMime) {
    //         console.log(`Looked up MIME type using filename: ${lookedUpMime}`);
    //         return lookedUpMime;
    //     }
    // }

    // 3. Infer from URI extension (fallback)
    const uriParts = asset.uri.split('.');
    const extension = uriParts.pop()?.toLowerCase();
    console.log(`Inferring MIME type from extension: .${extension}`);
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'webp':
            return 'image/webp';
        case 'bmp':
            return 'image/bmp';
        // Add other image types if necessary
        default:
            // 4. Final fallback (e.g., if no extension or unknown)
            console.warn(`Could not determine specific MIME type for URI: ${asset.uri}. Defaulting to image/jpeg.`);
            return 'image/jpeg'; // Default to common type
    }
}


// --- Utility function to convert a file URI to base64 (Error Handling) ---
export async function getBase64FromUri(uri: string): Promise<string> {
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
    } catch (error: any) {
        console.error(`Failed to read file as base64: ${uri}`, error);
        // Provide a more specific error message
        throw new Error(`Failed to read image file: ${error.message || 'Unknown error'}`);
    }
}


// --- Service Interaction Functions (with better error handling context) ---

// Get macros from recipe text
export async function getMacrosFromText(
    foodName: string,
    ingredients: string
): Promise<Macros> {
    try {
        console.log(`Requesting macros for recipe: "${foodName}"`);
        const macros = await getMacrosForRecipe(foodName, ingredients);
        console.log(`Received macros for recipe: "${foodName}"`);
        return macros;
    } catch (error) {
        // Log with context before Alert/re-throw
        console.error(`Error getting macros for recipe "${foodName}":`, error);
        const message = error instanceof BackendError
            ? error.message
            : `Failed to get macros for recipe: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("AI Error (Recipe)", message);
        throw error;
    }
}

// Get macros for a single food item from an image asset
export async function getMacrosForImageFile(asset: ImagePickerAsset): Promise<MacrosWithFoodName> {
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
    } catch (err) {
        Alert.alert("Image Read Error", err instanceof Error ? err.message : "Failed to read image file.");
        throw err;
    }

    const mimeType = determineMimeType(asset);
    console.log(`Requesting single food analysis. MIME: ${mimeType}, Asset URI: ${asset.uri}`);

    try {
        const result = await getMacrosForImageSingle(base64File, mimeType);
        console.log(`Received single food analysis: ${result.foodName}`);
        return result;
    } catch (error) {
        console.error(`Error getting single food macros for image ${asset.uri}:`, error);
        const message = error instanceof BackendError
            ? error.message
            : `Image analysis failed: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("Analysis Failed (Single Item)", message);
        throw error;
    }
}

// Get multiple estimated food items from an image asset
export async function getMultipleFoodsFromImage(asset: ImagePickerAsset): Promise<EstimatedFoodItem[]> {
    console.log(`Starting getMultipleFoodsFromImage for asset URI: ${asset.uri}`);
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
        console.log("Converted multi-food image to base64.");
    } catch (err) {
         Alert.alert("Image Read Error", err instanceof Error ? err.message : "Failed to read image file.");
         throw err;
    }

    const mimeType = determineMimeType(asset);
    console.log(`Requesting multi-food analysis. MIME: ${mimeType}, Asset URI: ${asset.uri}`);

    try {
        console.log("Calling backendService.getMacrosForImageMultiple...");
        const results = await getMacrosForImageMultiple(base64File, mimeType);
        console.log(`Received ${results.length} estimated items from backend.`);
        return results;
    } catch (error) {
        console.error(`Error getting multiple food macros for image ${asset.uri}:`, error);
         const message = error instanceof BackendError
            ? error.message
            : `Could not analyze image: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("Quick Add Failed (Multi-Item)", message);
        throw error;
    }
}

// Re-export types and potentially BackendError if components need it directly
export { BackendError, EstimatedFoodItem, Macros, MacrosWithFoodName };