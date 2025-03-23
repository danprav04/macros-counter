// src/utils/ai.ts
import {
  OpenRouterChatCompletionResponse,
  OpenRouterMessage,
} from "../types/openRouterTypes";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// No API_KEY constant here anymore

export async function getChatCompletion(
  model: string,
  messages: OpenRouterMessage[],
  responseFormat: "json_object" | "text" = "text",
  apiKey?: string // apiKey is now optional, for easier testing
): Promise<OpenRouterChatCompletionResponse> {
  // Get the API key from the environment variable.
  const effectiveApiKey = apiKey || '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';

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${effectiveApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format:
        responseFormat === "json_object" ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API request failed with status code ${response.status}: ${errorText}`
    );
  }

  const data: OpenRouterChatCompletionResponse = await response.json();

  if (
    !data.choices ||
    data.choices.length === 0 ||
    !data.choices[0].message ||
    !data.choices[0].message.content
  ) {
    throw new Error("Could not find the expected content in the response.");
  }

  return data;
}
