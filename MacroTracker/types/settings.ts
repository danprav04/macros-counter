// types/settings.ts (Corrected)

export const macros = ["calories", "protein", "carbs", "fat"] as const;
export type MacroType = (typeof macros)[number];

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
  dailyGoals: {
    [key in MacroType]: number;
  };
  settingsHistory?: { date: number; dailyGoals: { [key in MacroType]: number } }[];
  language?: string; // <-- ADD THIS LINE (make it optional)
}

export interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}