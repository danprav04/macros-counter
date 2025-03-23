// utils/macros.ts
import { getChatCompletion } from "./ai";
import { OpenRouterMessage } from "../types/openRouterTypes";

export interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export async function getMacrosForRecipe(foodName: string, Ingredients: string): Promise<Macros> { // Changed parameter
    const prompt = `
    Calculate the macros per 100g for the following food.  Output ONLY a JSON object with the keys "calories", "protein", "carbs", and "fat".  Do NOT include any other text, explanations, or calculations.

    Food: ${foodName}
    Ingredients:
    ${Ingredients}
    `;

    const messages: OpenRouterMessage[] = [{ role: "user", content: prompt }];

    try {
        const response = await getChatCompletion(
            "google/gemini-2.0-flash-thinking-exp-1219:free", // Or your chosen model
            messages,
            "json_object"
        );

        const content = response.choices[0].message.content;
        const cleanedContent = content.trim().replace(/^```json\s*|\s*```$/g, "");
        const macroInfo: Macros = JSON.parse(cleanedContent);
        return macroInfo;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error("Error: The response was not valid JSON.");
            throw new Error("Invalid JSON response from AI.");
        }
        console.error("Error fetching macros:", error);
        throw error;
    }
}