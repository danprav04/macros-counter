// --- NEW FUNCTION ---

import { OpenRouterMessage } from "../types/openRouterTypes";
import { getChatCompletion } from "./ai";

/**
 * Estimates the weight in grams based on a natural language description and food item.
 * @param foodName The name of the food item (e.g., "Apple").
 * @param quantityDescription The natural language description (e.g., "2 small", "1 cup chopped").
 * @returns A promise that resolves with the estimated weight in grams (number).
 */
export async function getGramsFromNaturalLanguage(
    foodName: string,
    quantityDescription: string
): Promise<number> {
    const prompt = `
    Estimate the approximate weight in grams for the following quantity of food.
    Food: "${foodName}"
    Quantity: "${quantityDescription}"

    Respond with ONLY the estimated numeric value in grams. Do not include units (like 'g' or 'grams'), explanations, or any other text. Just the number.
    Example response: 150
    `;

    const messages: OpenRouterMessage[] = [{ role: "user", content: prompt }];

    try {
        // Using a capable but potentially free/cheap model
        const response = await getChatCompletion(
            "google/gemini-2.0-flash-thinking-exp-1219:free", // Or try "mistralai/mistral-7b-instruct:free", "nousresearch/nous-hermes-2-mixtral-8x7b-dpo:free"
            messages,
            "text" // Expecting plain text number
        );

        const content = response.choices[0].message.content.trim();

        // Try to parse the response as a number
        const estimatedGrams = parseFloat(content);

        if (isNaN(estimatedGrams)) {
            console.error(`AI response was not a valid number: "${content}"`);
            throw new Error("AI did not return a valid number for grams.");
        }

        return Math.round(estimatedGrams); // Return rounded integer grams

    } catch (error) {
        console.error("Error getting grams estimation from AI:", error);
        // Re-throw the error so the calling component can handle it
        throw error;
    }
}