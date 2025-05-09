// src/types/questionnaire.ts
export enum Sex {
    MALE = 'male',
    FEMALE = 'female',
  }
  
  export enum ActivityLevel {
    SEDENTARY = 'sedentary',
    LIGHT = 'light',
    MODERATE = 'moderate',
    ACTIVE = 'active',
    VERY_ACTIVE = 'very_active',
  }
  
  export enum PrimaryGoal {
    LOSE_WEIGHT = 'lose_weight',
    MAINTAIN_WEIGHT = 'maintain_weight',
    GAIN_MUSCLE = 'gain_muscle',
  }
  
  export enum GoalIntensity {
    MILD = 'mild',
    MODERATE = 'moderate',
    AGGRESSIVE = 'aggressive',
  }
  
  export interface QuestionnaireFormData {
    age: string;
    sex: Sex | ''; // Allow empty initial state for Picker
    height: string; // cm
    weight: string; // kg
    activityLevel: ActivityLevel | ''; // Allow empty initial state
    primaryGoal: PrimaryGoal | ''; // Allow empty initial state
    goalIntensity?: GoalIntensity;
  }
  
  export interface CalculatedGoals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }