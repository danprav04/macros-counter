// src/utils/macros.ts
import * as FileSystem from 'expo-file-system';
import {
    getMacrosForRecipe,
    getMacrosForImageSingle,
    getMacrosForImageMultiple,
    BackendError // Re-export for components if needed
} from '../services/backendService';
import { Alert } from 'react-native';
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { ImagePickerAsset } from 'expo-image-picker';
import { getBase64FromUri } from './imageUtils'; // Use shared utility

// --- Helper function to determine MIME type ---
export function determineMimeType(asset: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
}): string {
    // 1. Prioritize asset.mimeType
    if (asset.mimeType && asset.mimeType.includes('/')) {
        console.log(`MIME Type: Using provided type: ${asset.mimeType}`);
        return asset.mimeType;
    }

    // 2. Infer from URI extension (fallback)
    const uriParts = asset.uri.split('.');
    const extension = uriParts.pop()?.toLowerCase();
    console.log(`MIME Type: Inferring from extension: .${extension}`);
    switch (extension) {
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'bmp': return 'image/bmp';
        default:
            console.warn(`MIME Type: Could not determine specific type for URI: ${asset.uri}. Defaulting to image/jpeg.`);
            return 'image/jpeg'; // Default
    }
}


// --- Service Interaction Functions (with improved error handling context) ---

// Get macros from recipe text
export async function getMacrosFromText(
    foodName: string,
    ingredients: string
): Promise<Macros> {
    try {
        console.log(`Util: Requesting macros for recipe: "${foodName}"`);
        const macros = await getMacrosForRecipe(foodName, ingredients);
        console.log(`Util: Received macros for recipe: "${foodName}"`);
        return macros;
    } catch (error) {
        console.error(`Util: Error getting macros for recipe "${foodName}":`, error);
        const message = error instanceof BackendError
            ? error.message
            : `Failed to get macros for recipe: ${error instanceof Error ? error.message : String(error)}`;
        // Display error, but let the caller handle further actions (like stopping loading states)
        Alert.alert("AI Error (Recipe)", message);
        throw error; // Re-throw to allow caller to handle
    }
}

// Get macros for a single food item from an image asset
export async function getMacrosForImageFile(asset: ImagePickerAsset): Promise<MacrosWithFoodName> {
    let base64File: string;
    try {
        // Use shared utility for base64 conversion
        base64File = await getBase64FromUri(asset.uri);
    } catch (err) {
        Alert.alert("Image Read Error", err instanceof Error ? err.message : "Failed to read image file.");
        throw err; // Re-throw error for caller to handle
    }

    const mimeType = determineMimeType(asset);
    console.log(`Util: Requesting single food analysis. MIME: ${mimeType}, Asset URI: ${asset.uri}`);

    try {
        const result = await getMacrosForImageSingle(base64File, mimeType);
        console.log(`Util: Received single food analysis: ${result.foodName}`);
        return result;
    } catch (error) {
        console.error(`Util: Error getting single food macros for image ${asset.uri}:`, error);
        const message = error instanceof BackendError
            ? error.message
            : `Image analysis failed: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("Analysis Failed (Single Item)", message);
        throw error; // Re-throw error
    }
}

// Get multiple estimated food items from an image asset
export async function getMultipleFoodsFromImage(base64Image: string, mimeType: string): Promise<EstimatedFoodItem[]> {
    console.log(`Util: Requesting multi-food analysis. MIME: ${mimeType}`);

    try {
        const results = await getMacrosForImageMultiple(base64Image, mimeType);
        console.log(`Util: Received ${results.length} estimated items from backend.`);
        // Optional: Basic validation of results structure here if needed
        if (!Array.isArray(results)) {
            console.error("Util: Backend returned non-array for multiple food items:", results);
            throw new Error("Invalid response format from server for multiple items.");
        }
        return results;
    } catch (error) {
        console.error(`Util: Error getting multiple food macros from image:`, error);
         const message = error instanceof BackendError
            ? error.message
            : `Could not analyze image: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("Quick Add Failed (Multi-Item)", message);
        throw error; // Re-throw error
    }
}

// Re-export types and potentially BackendError if components need it directly
export { BackendError, EstimatedFoodItem, Macros, MacrosWithFoodName };