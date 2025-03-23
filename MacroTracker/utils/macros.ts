// src/utils/macros.ts

import { getChatCompletion } from "./ai";
import { OpenRouterMessage } from "../types/openRouterTypes";

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function getMacrosForRecipe(ingredients: string): Promise<Macros> {
  const prompt = `
  Calculate the macros per 100g for the following recipe.  Output ONLY a JSON object with the keys "calories", "protein", "carbs", and "fat".  Do NOT include any other text, explanations, or calculations.
  
  Ingredients:
  ${ingredients}
  `;

  const messages: OpenRouterMessage[] = [{ role: "user", content: prompt }];

  try {
    const response = await getChatCompletion(
      "google/gemini-2.0-flash-thinking-exp-1219:free",
      messages,
      "json_object"
    );

    const content = response.choices[0].message.content;
    // Corrected line: Use trim() instead of strip()
    const cleanedContent = content.trim().replace(/^```json\s*|\s*```$/g, "");
    const macroInfo: Macros = JSON.parse(cleanedContent);
    return macroInfo;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // More specific error handling.
      console.error("Error: The response was not valid JSON.");
      throw new Error("Invalid JSON response from AI."); // Re-throw with a more informative message
    }
    console.error("Error fetching macros:", error);
    throw error; // Re-throw the original error for handling by the caller.
  }
}
