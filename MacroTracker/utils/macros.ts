// utils/macros.ts
import * as FileSystem from "expo-file-system";
// Use the React Native compatible library
import MimeTypes from 'react-native-mime-types';
import {
  OpenRouterChatCompletionResponse,
  OpenRouterMessage,
  // Make sure these types are correctly defined in your types file
} from "../types/openRouterTypes"; // Adjust path if needed (e.g., "../utils/types")

// Interfaces
export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacrosWithFoodName extends Macros {
  foodName: string;
}


// --- MOCK/Placeholder getChatCompletion ---
// Replace this with your actual implementation if it lives elsewhere
async function getChatCompletion(model: string, messages: OpenRouterMessage[], response_format?: string): Promise<OpenRouterChatCompletionResponse> {
    console.log("Mock getChatCompletion called for model:", model);
    const effectiveApiKey = "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"; // Use your key securely

    const body: any = {
        model: model,
        messages: messages,
    };
    if (response_format) {
        body.response_format = { type: response_format };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${effectiveApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Mock API Error:", errorText);
        throw new Error(`Mock API request failed: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return data as OpenRouterChatCompletionResponse;
}
// --- END MOCK ---


// Function to get macros from text description
export async function getMacrosForRecipe(
    foodName: string,
    Ingredients: string
): Promise<Macros> {
    const prompt = `
      Calculate the macros per 100g for the following food. Output ONLY a JSON object with the keys "calories", "protein", "carbs", and "fat". Do NOT include any other text, explanations, or calculations.

      Food: ${foodName}
      Ingredients:
      ${Ingredients}
      `;

    // Content here is definitely a string
    const messages: OpenRouterMessage[] = [{ role: "user", content: prompt }];

    try {
        const response = await getChatCompletion(
            "google/gemini-2.0-flash-thinking-exp-1219:free", // Model for text
            messages,
            "json_object" // Request JSON output
        );

        if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
            throw new Error("Invalid response structure from AI.");
        }

        const messageContent = response.choices[0].message.content;
        if (typeof messageContent === 'string') {
            const cleanedContent = messageContent.trim().replace(/^```json\s*|\s*```$/g, "");
            try {
                 const macroInfo: Macros = JSON.parse(cleanedContent);
                 if (typeof macroInfo.calories !== 'number' || typeof macroInfo.protein !== 'number' || typeof macroInfo.carbs !== 'number' || typeof macroInfo.fat !== 'number') {
                    console.error("Parsed JSON has incorrect structure (recipe):", macroInfo);
                    throw new Error("AI returned data in an unexpected format.");
                 }
                 return macroInfo;
            } catch (parseError) {
                 if (parseError instanceof SyntaxError) {
                    console.error("Error: The recipe response content was not valid JSON.", parseError);
                    console.error("Cleaned content:", cleanedContent);
                    throw new Error("Invalid JSON response from AI.");
                 }
                 throw parseError;
            }
        } else {
            console.error("Error: AI recipe response content was not a string:", messageContent);
            throw new Error("Unexpected AI response format: content is not a string.");
        }

    } catch (error) {
        console.error("Error fetching/processing macros for recipe:", error);
        if (error instanceof Error && (error.message.startsWith("Invalid JSON") || error.message.startsWith("Unexpected AI response"))) {
             throw error; // Re-throw specific errors
        }
        throw new Error(`Failed to get macros for recipe: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Utility function to convert a file URI to base64
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

// Function to get macros from an image file
export async function getMacrosForImageFile(asset: {
  uri: string;
  fileName?: string; // Optional filename from ImagePicker
  type?: string; // Optional MIME type from ImagePicker
}): Promise<MacrosWithFoodName> {
  const prompt = `
    Analyze the food in the image provided and guess the food name, ingredients, and their approximate proportions based on visual estimation.
    Then, calculate the estimated macros per 100g (calories, protein, carbs, fat) for the food.
    Output ONLY a JSON object with the keys "foodName", "calories", "protein", "carbs", and "fat".
    Do NOT include any extra text, explanations, calculations, or markdown formatting like \`\`\`json.
    Just the raw JSON object.
  `;

  // 1. Get Base64 Data
  let base64File: string;
  try {
      base64File = await getBase64FromUri(asset.uri);
  } catch (err) {
      console.error("Error getting base64 from URI:", err);
      throw new Error("Failed to read image file.");
  }

  // 2. Determine MIME Type using react-native-mime-types
  let mimeType = asset.type; // Prioritize type from ImagePicker asset

  if (!mimeType && asset.fileName) {
      console.warn(`mimeType missing from ImagePicker asset (fileName: ${asset.fileName}). Attempting lookup.`);
      // Use the compatible library's lookup function
      mimeType = MimeTypes.lookup(asset.fileName) || undefined; // Returns false if not found, convert to undefined
  }

  // Default to jpeg if still undetermined (last resort)
  if (!mimeType) {
      console.warn(`Could not determine mimeType for ${asset.fileName}. Defaulting to image/jpeg.`);
      mimeType = 'image/jpeg';
  }

  console.log(`Using mimeType: ${mimeType} for image processing.`);
  const imageUrl = `data:${mimeType};base64,${base64File}`;

  // 3. Construct Messages for Vision Model
  const messages: OpenRouterMessage[] = [
    {
      role: "user",
      content: [ // Content is an array for multi-modal
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        },
      ],
    },
  ];

  // 4. Prepare API Request Body
  const bodyData = {
    model: "google/gemini-2.0-flash-thinking-exp-1219:free", // DO NOT CHANGE MODEL per user request
    messages: messages,
    response_format: { type: "json_object" },
    // max_tokens: 512, // Optional: Consider adding if responses get cut off
  };

  // 5. API Key (Use secure storage in production!)
  const effectiveApiKey =
    "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";
  if (!effectiveApiKey) {
    throw new Error("API key is missing");
  }

  // 6. Make API Call and Process Response
  try {
    console.log("Sending request to OpenRouter vision model...");
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

    const responseBodyText = await response.text(); // Read body once

    if (!response.ok) {
      console.error("OpenRouter API Error Response Text:", responseBodyText);
      // Attempt to parse error for more details if possible
      try {
          const errorJson = JSON.parse(responseBodyText);
          console.error("Parsed API Error:", errorJson);
      } catch (e) { /* Ignore parsing error if body wasn't JSON */ }
      throw new Error(
        `API request failed with status ${response.status}: ${responseBodyText}`
      );
    }

    console.log("OpenRouter API Success Response Text:", responseBodyText);
    const data: OpenRouterChatCompletionResponse = JSON.parse(responseBodyText);

    // Validate response structure
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
         console.error("API Response missing choices or message:", data);
         throw new Error("Could not find message structure in the AI response.");
    }

    const choice = data.choices[0];
    const messageContent = choice.message.content; // Type is string | OpenRouterContentPart[]

    // Use Type Guard to ensure response content is a string
    let responseContentString: string;
    if (typeof messageContent === 'string') {
        responseContentString = messageContent;
    }
    // Less likely fallback (check if needed based on testing)
    // else if (typeof (choice as any).text === 'string') {
    //     console.warn("Using fallback 'text' field from choice.");
    //     responseContentString = (choice as any).text;
    // }
    else {
        // Handle unexpected content format (array, null, etc.)
        console.error("Error: AI response content was not a string as expected:", messageContent);
        throw new Error("Unexpected AI response format: content is not a string.");
    }

    console.log("Raw AI content string:", responseContentString);

    // Clean and Parse the JSON String
    const cleanedContent = responseContentString.trim().replace(/^```json\s*|\s*```$/g, "");

    try {
        const macroInfo: MacrosWithFoodName = JSON.parse(cleanedContent);
        // Validate parsed object structure
        if (typeof macroInfo.foodName !== 'string' ||
            typeof macroInfo.calories !== 'number' ||
            typeof macroInfo.protein !== 'number' ||
            typeof macroInfo.carbs !== 'number' ||
            typeof macroInfo.fat !== 'number') {
            console.error("Parsed JSON has incorrect structure (image):", macroInfo);
            throw new Error("AI returned data in an unexpected format.");
        }
        console.log('macroInfo: ', macroInfo);
        return macroInfo;
    } catch (parseError) {
        if (parseError instanceof SyntaxError) {
            console.error("Error: The AI response was not valid JSON after cleaning.");
            console.error("Cleaned content:", cleanedContent);
            throw new Error("Invalid JSON response from AI.");
        }
        throw parseError; // Re-throw other parsing errors
    }

  } catch (error) {
    // Handle fetch/network errors
    if (error instanceof TypeError && error.message === 'Network request failed') {
       console.error("Network Error: Could not connect to the API. Check internet connection and OpenRouter status.");
       throw new Error("Network error: Failed to reach AI service.");
    }
    // Log and re-throw other errors
    console.error("Error processing image analysis request:", error);
    if (error instanceof Error && (error.message.startsWith("Invalid JSON") || error.message.startsWith("Unexpected AI response") || error.message.startsWith("Could not find") || error.message.startsWith("API request failed"))) {
         throw error; // Re-throw specific known error types
    }
    // General fallback error
    throw new Error(`Failed to get macros from image: ${error instanceof Error ? error.message : String(error)}`);
  }
}