// src/utils/units.ts
import { Alert } from 'react-native';
import { estimateGramsNaturalLanguage, BackendError } from '../services/backendService';

/**
 * Estimates the weight in grams based on a natural language description and food item, using the backend service.
 * @param foodName The name of the food item (e.g., "Apple").
 * @param quantityDescription The natural language description (e.g., "2 small", "1 cup chopped").
 * @returns A promise that resolves with the estimated weight in grams (number).
 */
export async function getGramsFromNaturalLanguage(
    foodName: string,
    quantityDescription: string
): Promise<number> {
    try {
        const grams = await estimateGramsNaturalLanguage(foodName, quantityDescription);
        return grams; // Backend service already rounds
    } catch (error) {
        console.error("Error getting grams estimation from backend:", error);
        const message = error instanceof BackendError
            ? error.message
            : `Could not estimate grams: ${error instanceof Error ? error.message : String(error)}`;
        Alert.alert("AI Estimation Failed", message);
        throw error; // Re-throw error
    }
}