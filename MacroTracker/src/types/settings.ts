// src/types/settings.ts
// types/settings.ts
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
  onLocaleChange: (locale: LanguageCode) => void; // Added for language change
}