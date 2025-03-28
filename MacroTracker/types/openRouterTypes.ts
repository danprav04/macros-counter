// src/utils/types.ts
// Defining types here helps with autocompletion and type safety
export interface OpenRouterMessage {
  role: "user" | "assistant" | "system"; // Add system role
  content: string;
}

export interface OpenRouterChoice {
  text: any;
  message: OpenRouterMessage;
  finish_reason?: string; // Optional properties for handling different responses
  index?: number;
}

export interface OpenRouterChatCompletionResponse {
  choices: OpenRouterChoice[];
  // You might add other fields that OpenRouter returns if you need them.
  // Example: id, created, model, usage, etc.
  id?: string;
  created?: number;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
