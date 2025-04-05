// utils/macros.ts
import * as FileSystem from "expo-file-system";
// Use the React Native compatible library
import MimeTypes from 'react-native-mime-types';
import {
  OpenRouterChatCompletionResponse,
  OpenRouterMessage,
  // Make sure these types are correctly defined in your types file
} from "../types/openRouterTypes"; // Adjust path if needed (e.g., "../types")

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

/**
 * Represents a single food item estimated from an image,
 * including its name, estimated weight, and macros per 100g.
 */
export interface EstimatedFoodItem {
  foodName: string;
  estimatedWeightGrams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
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

    /* START MOCK RESPONSE FOR MULTIPLE FOODS */
    // ONLY FOR TESTING getMultipleFoodsFromImage - REMOVE LATER
    if (messages[0]?.content && Array.isArray(messages[0].content) && messages[0].content.some(c => c.type === 'image_url')) {
        const textContent = messages[0].content.find(c => c.type === 'text')?.text || '';
         if (textContent.includes("Identify all distinct food items")) { // Check if it's the multi-food prompt
            console.log("--- RETURNING MOCK MULTI-FOOD RESPONSE ---");
             const mockResponseContent = JSON.stringify([
                { "foodName": "Grilled Chicken Breast", "estimatedWeightGrams": 150, "calories_per_100g": 165, "protein_per_100g": 31, "carbs_per_100g": 0, "fat_per_100g": 3.6 },
                { "foodName": "Steamed Broccoli", "estimatedWeightGrams": 80, "calories_per_100g": 55, "protein_per_100g": 3.7, "carbs_per_100g": 11.2, "fat_per_100g": 0.6 },
                { "foodName": "Quinoa", "estimatedWeightGrams": 120, "calories_per_100g": 120, "protein_per_100g": 4.1, "carbs_per_100g": 21.3, "fat_per_100g": 1.9 }
            ]);
             data.choices = [{
                message: {
                    role: 'assistant',
                    content: mockResponseContent
                },
                finish_reason: 'stop'
             }];
             return data;
         }
    }
    /* END MOCK RESPONSE */

    console.log("Mock API Response:", JSON.stringify(data, null, 2));
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

// Function to get macros for a single food item from an image file
export async function getMacrosForImageFile(asset: {
  uri: string;
  fileName?: string; // Optional filename from ImagePicker
  type?: string; // Optional MIME type from ImagePicker
}): Promise<MacrosWithFoodName> {
  const prompt = `
    Analyze the food in the image provided and guess the food name, ingredients, and their approximate proportions based on visual estimation or nutrients table if it exists in the image.
    Some nutrients tables might have nutrients per portion in addition to 100g one, be careful to take only the 100g one.
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
    console.log("Sending request to OpenRouter vision model (single food)...");
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

    const responseBodyText = await response.text();

    if (!response.ok) {
      console.error(
        `API Error (${response.status}): ${responseBodyText}`
      );
      throw new Error(
        `API request failed with status ${response.status}: ${responseBodyText}`
      );
    }

    // Log the raw response text for debugging
    // console.log("Raw API Response Text:", responseBodyText);

    // Attempt to parse the JSON response
    let data: OpenRouterChatCompletionResponse;
    try {
      data = JSON.parse(responseBodyText);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.error("Response body that failed to parse:", responseBodyText);
      throw new Error("Failed to parse API response as JSON.");
    }

    // 7. Validate and Extract Information
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      console.error("Invalid response structure from AI:", data);
      throw new Error("Invalid response structure from AI.");
    }

    const messageContent = data.choices[0].message.content;
    if (typeof messageContent !== 'string') {
        console.error("Error: AI vision response content was not a string:", messageContent);
        throw new Error("Unexpected AI response format: content is not a string.");
    }

    // Clean the string content (remove potential markdown formatting)
    const cleanedContent = messageContent.trim().replace(/^```json\s*|\s*```$/g, "");

     // Log cleaned content before parsing
    // console.log("Cleaned JSON content from vision AI:", cleanedContent);

    try {
        const macroInfo: MacrosWithFoodName = JSON.parse(cleanedContent);

        // Validate the structure and types
        if (
            typeof macroInfo.foodName !== 'string' ||
            typeof macroInfo.calories !== 'number' ||
            typeof macroInfo.protein !== 'number' ||
            typeof macroInfo.carbs !== 'number' ||
            typeof macroInfo.fat !== 'number'
        ) {
            console.error("Parsed JSON has incorrect structure (image):", macroInfo);
            throw new Error("AI returned data in an unexpected format.");
        }

        console.log("Successfully extracted macros from image:", macroInfo);
        return macroInfo;

    } catch (parseError) {
        if (parseError instanceof SyntaxError) {
            console.error("Error: The vision response content was not valid JSON.", parseError);
            console.error("Cleaned content that failed parsing:", cleanedContent);
            throw new Error("Invalid JSON response from AI vision model.");
        }
         // Re-throw other potential errors during parsing/validation
                 throw parseError;
    }

  } catch (error) {
    console.error("Error fetching/processing macros for image file:", error);
     // Re-throw specific errors from within the try block
     if (error instanceof Error && (error.message.startsWith("Failed to parse API response") || error.message.startsWith("Invalid JSON response") || error.message.startsWith("AI returned data in an unexpected format") || error.message.startsWith("Invalid response structure"))) {
        throw error;
    }
     // Throw a more generic error for other issues
    throw new Error(
      `Failed to get macros from image: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    }
  }


/**
 * Get estimations for potentially multiple distinct food items from an image.
 * @param asset - The image asset containing the food(s).
 * @returns A promise resolving to an array of EstimatedFoodItem.
 */
export async function getMultipleFoodsFromImage(asset: {
  uri: string;
  fileName?: string;
  type?: string;
}): Promise<EstimatedFoodItem[]> {
  const prompt = `
    Identify all distinct food items visible in the image. For each item, provide:
    1. A descriptive 'foodName' (e.g., "Grilled Salmon", "Steamed Asparagus", "Mashed Potatoes").
    2. An 'estimatedWeightGrams' based on visual approximation (be reasonable).
    3. The estimated nutritional content per 100 grams: 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g'. If the image clearly shows a nutrition label with per 100g values, prioritize using those values. Otherwise, provide your best estimate based on the identified food type.

    Output ONLY a valid JSON array where each element is an object containing these keys: "foodName", "estimatedWeightGrams", "calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g".
    Do NOT include any extra text, explanations, notes, warnings, or markdown formatting like \`\`\`json.
    Just the raw JSON array. If no food is identifiable, return an empty array [].
  `;

  // 1. Get Base64 Data (reusing the utility function)
  let base64File: string;
  try {
      base64File = await getBase64FromUri(asset.uri);
  } catch (err) {
      console.error("Error getting base64 from URI:", err);
      throw new Error("Failed to read image file.");
}

  // 2. Determine MIME Type (reusing the same logic)
  let mimeType = asset.type;
  if (!mimeType && asset.fileName) {
      mimeType = MimeTypes.lookup(asset.fileName) || undefined;
  }
  if (!mimeType) {
      console.warn(`Could not determine mimeType for ${asset.fileName}. Defaulting to image/jpeg.`);
      mimeType = 'image/jpeg';
  }
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
        model: "google/gemini-2.0-flash-thinking-exp-1219:free", // Use the same capable model <- DO NOT CHANGE MODEL per user request
        messages: messages,
        response_format: { type: "json_object" }, // Request JSON output, even if it's an array []
        // max_tokens: 1024, // Consider increasing tokens if many items are expected
   };

   // 5. API Key (ensure secure handling)
   const effectiveApiKey = "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";
   if (!effectiveApiKey) {
       throw new Error("API key is missing");
   }

   // 6. Make API Call and Process Response
   try {
       console.log("Sending request to OpenRouter vision model (multiple foods)...");
       // USING THE MOCK FUNCTION FOR TESTING - REPLACE WITH ACTUAL FETCH LATER
        const data = await getChatCompletion(
          bodyData.model, // Pass the model name
          bodyData.messages, // Pass the messages array
          "json_object" // Pass the response format
        );
       // console.log("Raw Multi-Food API Response:", JSON.stringify(data, null, 2)); // Log raw response for debugging


       // --- THIS SECTION USES fetch() WHEN NOT MOCKING ---
       /*
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
           console.error(
               `API Error (${response.status}): ${responseBodyText}`
           );
           throw new Error(
               `API request failed with status ${response.status}: ${responseBodyText}`
           );
       }

       // Attempt to parse the JSON response
       let data: OpenRouterChatCompletionResponse;
       try {
           data = JSON.parse(responseBodyText);
       } catch (parseError) {
           console.error("Error parsing JSON response (multi-food):", parseError);
           console.error("Response body that failed to parse:", responseBodyText);
           throw new Error("Failed to parse API response as JSON.");
       }
        */
       // --- END OF fetch() SECTION ---


       // 7. Validate and Extract Information (common logic for both mock and real fetch)
       if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
           console.error("Invalid response structure from multi-food AI:", data);
           throw new Error("Invalid response structure from AI.");
       }

       const messageContent = data.choices[0].message.content;
       if (typeof messageContent !== 'string') {
           console.error("Error: AI multi-food response content was not a string:", messageContent);
           throw new Error("Unexpected AI response format: content is not a string.");
       }

       // Clean the string content
       const cleanedContent = messageContent.trim().replace(/^```json\s*|\s*```$/g, "");

    //    console.log("Cleaned JSON content from multi-food AI:", cleanedContent); // Log cleaned content

       try {
            const estimatedItems: any[] = JSON.parse(cleanedContent); // Expecting an array

            if (!Array.isArray(estimatedItems)) {
                 console.error("Parsed JSON is not an array (multi-food):", estimatedItems);
                 throw new Error("AI returned data that is not a JSON array.");
            }

            // Validate each item in the array
            const validatedItems: EstimatedFoodItem[] = estimatedItems.map((item, index) => {
                if (
                    typeof item !== 'object' || item === null ||
                    typeof item.foodName !== 'string' ||
                    typeof item.estimatedWeightGrams !== 'number' ||
                    typeof item.calories_per_100g !== 'number' ||
                    typeof item.protein_per_100g !== 'number' ||
                    typeof item.carbs_per_100g !== 'number' ||
                    typeof item.fat_per_100g !== 'number'
                ) {
                    console.error(`Parsed JSON array item at index ${index} has incorrect structure:`, item);
                    throw new Error(`AI returned an array item with unexpected format at index ${index}.`);
                }
                 // Ensure numbers are non-negative
                 if (item.estimatedWeightGrams < 0 || item.calories_per_100g < 0 || item.protein_per_100g < 0 || item.carbs_per_100g < 0 || item.fat_per_100g < 0) {
                    console.warn(`Item "${item.foodName}" has negative values, correcting to 0.`);
                    item.estimatedWeightGrams = Math.max(0, item.estimatedWeightGrams);
                    item.calories_per_100g = Math.max(0, item.calories_per_100g);
                    item.protein_per_100g = Math.max(0, item.protein_per_100g);
                    item.carbs_per_100g = Math.max(0, item.carbs_per_100g);
                    item.fat_per_100g = Math.max(0, item.fat_per_100g);
                 }

                return item as EstimatedFoodItem;
            });

            console.log("Successfully extracted multiple food items from image:", validatedItems);
            return validatedItems;

       } catch (parseError) {
            if (parseError instanceof SyntaxError) {
               console.error("Error: The multi-food response content was not valid JSON.", parseError);
               console.error("Cleaned content that failed parsing:", cleanedContent);
               throw new Error("Invalid JSON response from AI vision model (multi-food).");
            }
            // Re-throw other potential errors during parsing/validation
            throw parseError;
       }

   } catch (error) {
       console.error("Error fetching/processing multiple foods for image file:", error);
        // Re-throw specific errors
        if (error instanceof Error && (error.message.includes("Failed to parse") || error.message.includes("Invalid JSON") || error.message.includes("unexpected format") || error.message.includes("not a JSON array") || error.message.includes("Invalid response structure"))) {
           throw error;
        }
       // Throw a more generic error
       throw new Error(
           `Failed to get multiple foods from image: ${
               error instanceof Error ? error.message : String(error)
           }`
       );
   }
}

