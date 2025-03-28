// utils/macros.ts
import * as FileSystem from "expo-file-system";
import { getChatCompletion } from "./ai";
import {
  OpenRouterChatCompletionResponse,
  OpenRouterMessage,
} from "../types/openRouterTypes";

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacrosWithFoodName extends Macros {
  foodName: string;
}

export async function getMacrosForRecipe(
  foodName: string,
  Ingredients: string
): Promise<Macros> {
  // Changed parameter
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

// Utility function to convert a file (from its URI) to a base64 string.
// Implementation depends on your environment (Node, React Native, etc.)
export async function getBase64FromUri(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    throw new Error(`Failed to convert file to base64: ${error}`);
  }
}

export async function getMacrosForImageFile(asset: {
  uri: string;
  fileName?: string;
  type?: string;
}): Promise<MacrosWithFoodName> {
  const prompt = `
          Analyze the food in the image provided and guess the food name, ingredients, and their proportions.
          Then, calculate the macros per 100g (calories, protein, carbs, fat) for the food.
          Output ONLY a JSON object with the keys "foodName", "calories", "protein", "carbs", and "fat".
          Do NOT include any extra text, explanations, or calculations.
        `;

  // Convert the image to base64
  const base64File = await getBase64FromUri(asset.uri);

  const bodyData = {
    file: base64File,
    prompt,
    model: "google/gemini-2.5-pro-exp-03-25:free",
    response_format: { type: "json_object" },
  };

  const effectiveApiKey =
    "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";
  if (!effectiveApiKey) {
    throw new Error("API key is missing");
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data: OpenRouterChatCompletionResponse = await response.json();

    // Check if the expected content exists
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Could not find any choices in the response.");
    }

    const choice = data.choices[0];
    let content: string;
    if (choice.message && choice.message.content) {
      content = choice.message.content;
    } else if (choice.text) {
      content = choice.text;
    } else {
      throw new Error("Could not find the expected content in the response.");
    }

    const cleanedContent = content.trim().replace(/^```json\s*|\s*```$/g, "");
    const macroInfo: MacrosWithFoodName = JSON.parse(cleanedContent);
    return macroInfo;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
