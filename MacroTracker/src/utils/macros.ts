// src/utils/macros.ts
import * as FileSystem from 'expo-file-system';
import MimeTypes from 'react-native-mime-types';
import {
    getMacrosForRecipe,
    getMacrosForImageSingle,
    getMacrosForImageMultiple,
    BackendError
} from '../services/backendService'; // Import backend service functions
import { Alert } from 'react-native';
// Import types from the new location
import { Macros, MacrosWithFoodName, EstimatedFoodItem } from '../types/macros';

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
export async function getMacrosForImageFile(asset: {
    uri: string;
    fileName?: string | null; // Accept null for fileName
    type?: string;
}): Promise<MacrosWithFoodName> {
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
    } catch (err) {
        Alert.alert("Error", "Failed to read image file.");
        throw err; // Re-throw
    }

    let mimeType = asset.type;
    // Use fileName only if it's not null for lookup
    const validFileName = asset.fileName ?? undefined; // Convert null to undefined for lookup/logging
    if (!mimeType && validFileName) {
        mimeType = MimeTypes.lookup(validFileName) || undefined;
    }
    if (!mimeType) {
        mimeType = 'image/jpeg'; // Default fallback
    }

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
export async function getMultipleFoodsFromImage(asset: {
    uri: string;
    fileName?: string | null; // Accept null for fileName
    type?: string;
}): Promise<EstimatedFoodItem[]> {
    console.log(`Frontend: Starting getMultipleFoodsFromImage for asset URI: ${asset.uri}`);
    let base64File: string;
    try {
        base64File = await getBase64FromUri(asset.uri);
        console.log("Frontend: Successfully converted multi-food image to base64.");
    } catch (err) {
         Alert.alert("Error", "Failed to read image file.");
         throw err;
    }

    let mimeType = asset.type;
    // Use fileName only if it's not null for lookup
    const validFileName = asset.fileName ?? undefined; // Convert null to undefined
    if (!mimeType && validFileName) {
        mimeType = MimeTypes.lookup(validFileName) || undefined;
    }
    if (!mimeType) {
        mimeType = 'image/jpeg'; // Default fallback
    }
    console.log(`Frontend: Determined MIME type (multi-food): ${mimeType}`);

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

export { BackendError, EstimatedFoodItem };
