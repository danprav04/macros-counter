// src/types/settings.ts
import { QuestionnaireFormData } from './questionnaire';

export const macros = ["calories", "protein", "carbs", "fat"] as const;
export type MacroType = (typeof macros)[number];

export type LanguageCode = 'en' | 'ru' | 'he' | 'system';

export type SortOptionValue = 'name' | 'newest' | 'oldest';

export interface MacroData {
  x: number; // Timestamp
  y: number | null; // Macro value
}

export interface Statistics {
  calories: MacroData[][];
  protein: MacroData[][];
  carbs: MacroData[][];
  fat: MacroData[][];
}

export interface Settings {
  theme: "light" | "dark" | "system";
  language: LanguageCode;
  dailyGoals: {
    [key in MacroType]: number;
  };
  foodSortPreference?: SortOptionValue;
  settingsHistory?: { date: number; dailyGoals: { [key in MacroType]: number } }[];
  
  // New flags for Estimation Prompt
  hasCompletedEstimation?: boolean;
  isEstimationReminderDismissed?: boolean;

  // Flags for AI Features Promotion and Usage
  hasTriedAI?: boolean;
  isAiPromoDismissed?: boolean;

  // Draft state for questionnaire
  questionnaireDraft?: QuestionnaireFormData;
}

export interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLocaleChange: (locale: LanguageCode) => void; 
}

// Shared ParamList to ensure type safety across screens
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Questionnaire: { fromPrompt?: boolean } | undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export interface AppCosts {
    reward_ad_coins_amount: number;
    cost_grams_natural_language: number;
    cost_macros_recipe: number;
    cost_macros_image_single: number;
    cost_macros_image_multiple: number;
    cost_macros_text_multiple: number;
    cost_per_additional_image: number;
    ad_streak_start_reward: number;
    ad_streak_formula: 'linear' | 'exponential';
    ad_streak_linear_step: number;
    ad_streak_exponential_base: number;
    ad_streak_max_reward: number;
    ad_streak_ads_per_day: number;
}