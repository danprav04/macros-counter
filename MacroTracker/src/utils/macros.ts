// src/utils/macros.ts
import * as FileSystem from 'expo-file-system';
// Import MimeTypes library if you have it, otherwise use extension mapping
// import MimeTypes from 'react-native-mime-types'; // Uncomment if using react-native-mime-types
import {
    getMacrosForRecipe,
    getMacrosForImageSingle,
    getMacrosForImageMultiple,
    BackendError
} from '../services/backendService'; // Import backend service functions
import { Alert } from 'react-native';
// Import types from the new location
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';
import { ImagePickerAsset } from 'expo-image-picker'; // Import the specific type

// --- Helper function to determine MIME type ---
function determineMimeType(asset: {
    uri: string;
    mimeType?: string | null; // Explicitly use mimeType if provided
    fileName?: string | null; // Use fileName for fallback
    type?: string; // Keep existing 'type' for potential backward compatibility? (Less reliable)
}): string {
    // 1. Prioritize asset.mimeType if available (most reliable)
    if (asset.mimeType) {
        console.log(`Using provided MIME type: ${asset.mimeType}`);
        return asset.mimeType;
    }

    // 2. Fallback using react-native-mime-types library (if installed)
    // const validFileNameForLookup = asset.fileName ?? undefined;
    // if (validFileNameForLookup) {
    //     const lookedUpMime = MimeTypes.lookup(validFileNameForLookup);
    //     if (lookedUpMime) {
    //         console.log(`Looked up MIME type using filename: ${lookedUpMime}`);
    //         return lookedUpMime;
    //     }
    // }

    // 3. Fallback: Infer from URI extension (less reliable but better than 'image')
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
        default:
            // 4. Use asset.type if available and other methods failed (least reliable)
            if (asset.type && asset.type.includes('/')) {
                 console.warn(`Falling back to asset.type: ${asset.type}`);
                 return asset.type;
            }
             // 5. Final fallback
            console.warn(`Could not determine specific MIME type for URI: ${asset.uri}. Defaulting to image/jpeg.`);
            return 'image/jpeg';
    }
}


// --- Refactored Functions ---

// Function to get macros from text description (using backend)
export async function getMacrosFromText(
    foodName: string,
    ingredients: string // Changed param name for clarity
): Promise<Macros> {
    try {
        // Backend service already returns the correct Macros type
        const macros = await getMacrosForRecipe(foodName, ingredients);
        return macros;
    } catch (error) {
        console.error("Error fetching macros for recipe from backend:", error);
        const message = error instanceof BackendError
            ? error.message // Use message from BackendError (e.g., "Insufficient coins.")
            : `Failed to get macros for recipe: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("AI Error", message); // Show alert to user
        throw error; // Re-throw to allow calling component further handling if needed
    }
}

// Utility function to convert a file URI to base64 (remains the same)
export async function getBase64FromUri(uri: string): Promise<string> {
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
    } catch (error) {
        console.error(`Failed to convert file to base64: ${uri}`, error);
        throw new Error(`Failed to convert file to base64: ${error}`);
    }
}

// Function to get macros for a single food item from an image file (using backend)
// Accepts the specific type structure matching ImagePickerAsset properties needed
export async function getMacrosForImageFile(asset: ImagePickerAsset): Promise<MacrosWithFoodName> {
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
    } catch (err) {
        Alert.alert("Error", "Failed to read image file.");
        throw err; // Re-throw
    }

    // --- Determine Correct MIME Type using helper ---
    const mimeType = determineMimeType(asset);
    console.log(`Frontend (single-food): Determined MIME type: ${mimeType}`);

    try {
        // Backend service already returns the correct MacrosWithFoodName type
        const result = await getMacrosForImageSingle(base64File, mimeType);
        return result;
    } catch (error) {
        console.error("Error fetching single food macros from image from backend:", error);
         const message = error instanceof BackendError
            ? error.message
            : `Analysis failed: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("Analysis Failed", message);
        throw error; // Re-throw
    }
}


// Function for Multiple Foods (using backend)
// Accepts the specific type structure matching ImagePickerAsset properties needed
export async function getMultipleFoodsFromImage(asset: ImagePickerAsset): Promise<EstimatedFoodItem[]> {
    console.log(`Frontend: Starting getMultipleFoodsFromImage for asset URI: ${asset.uri}`);
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
        console.log("Frontend: Successfully converted multi-food image to base64.");
    } catch (err) {
         Alert.alert("Error", "Failed to read image file.");
         throw err;
    }

    // --- Determine Correct MIME Type using helper ---
    const mimeType = determineMimeType(asset);
    console.log(`Frontend (multi-food): Determined MIME type: ${mimeType}`);

    try {
        console.log("Frontend: Calling backendService.getMacrosForImageMultiple...");
        // Backend service already returns the correct EstimatedFoodItem[] type
        const results = await getMacrosForImageMultiple(base64File, mimeType);
        console.log(`Frontend: Received ${results.length} items from backend.`);
        return results;
    } catch (error) {
        console.error("Frontend: Error calling backend for multiple foods:", error);
         const message = error instanceof BackendError
            ? error.message
            : `Could not analyze image: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("Quick Add Failed", message);
        throw error; // Re-throw
    }
}

// Re-export BackendError and types if needed by components directly
export { BackendError, EstimatedFoodItem, Macros, MacrosWithFoodName };