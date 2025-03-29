// src/utils/types.ts

// =====================================
// Consolidated OpenRouter Type Definitions
// =====================================

// --- Content Parts (for multi-modal input like images) ---
export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

// --- Message Structure ---
// Allows content to be a simple string OR an array of content parts for vision models
export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | OpenRouterContentPart[]; // Consolidated definition
  name?: string; // Optional name field
}

// --- Choice Structure (within the response) ---
// This structure aligns with standard Chat Completion APIs (like OpenAI/OpenRouter)
export interface OpenRouterChatChoice {
  index: number;
  message: OpenRouterMessage; // Contains the actual message content and role
  logprobs?: any | null; // Optional log probabilities (use a specific type if known)
  finish_reason: string | null; // Can be null sometimes
  // text?: string; // Usually the content is inside message.content, keep optional if some models return it differently
}

// --- API Usage Information ---
export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// --- Main Chat Completion Response Structure ---
// Consolidates the fields from both previous declarations
export interface OpenRouterChatCompletionResponse {
  id: string;
  object: string; // Typically "chat.completion"
  created: number; // Timestamp
  model: string; // Model used
  choices: OpenRouterChatChoice[]; // Array of choices using the defined structure
  usage?: OpenRouterUsage; // Usage information is often optional
  // Add any other relevant fields you might encounter from OpenRouter
  // system_fingerprint?: string; // Example optional field
}


// =====================================
// Removed Redundant/Conflicting Declarations:
// =====================================

/*
// REMOVED - Duplicate/Outdated OpenRouterMessage
export interface OpenRouterMessage {
  role: "user" | "assistant" | "system"; // Add system role
  content: string;
}

// REMOVED - Less standard choice structure (often message.content is used instead of top-level text)
export interface OpenRouterChoice {
  text: any; // 'any' is vague, content is usually in message
  message: OpenRouterMessage; // This duplicates content info if 'text' is also present
  finish_reason?: string;
  index?: number;
}

// REMOVED - Duplicate/Simpler OpenRouterChatCompletionResponse
export interface OpenRouterChatCompletionResponse {
  choices: OpenRouterChoice[]; // Used the less standard choice type
  id?: string;
  created?: number;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
*/