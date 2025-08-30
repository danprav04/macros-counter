// src/types/settings.ts
export const macros = ["calories", "protein", "carbs", "fat"] as const;
export type MacroType = (typeof macros)[number];

export type LanguageCode = 'en' | 'ru' | 'he' | 'system';

export interface MacroData {
  x: number; // Timestamp
  y: number; // Macro value
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
  settingsHistory?: { date: number; dailyGoals: { [key in MacroType]: number } }[];
}

export interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLocaleChange: (locale: LanguageCode) => void; 
}

export interface AppCosts {
    reward_ad_coins_amount: number;
    cost_grams_natural_language: number;
    cost_macros_recipe: number;
    cost_macros_image_single: number;
    cost_macros_image_multiple: number;
    cost_macros_text_multiple: number;
    cost_per_additional_image: number;
}