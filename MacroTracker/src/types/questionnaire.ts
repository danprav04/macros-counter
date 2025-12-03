// src/types/questionnaire.ts

export enum CalculationMethod {
  BASIC = 'basic',
  ADVANCED = 'advanced'
}

export enum Sex {
    MALE = 'male',
    FEMALE = 'female',
  }
  
  // For Basic Algorithm (Static Multipliers)
  export enum ActivityLevel {
    SEDENTARY = 'sedentary', // 1.2
    LIGHT = 'light',         // 1.375
    MODERATE = 'moderate',   // 1.55
    ACTIVE = 'active',       // 1.725
    VERY_ACTIVE = 'very_active', // 1.9
  }

  // For Advanced Algorithm (Factorial Method)
  export enum JobActivity {
    SITTING = 'sitting', // 1.3 MET
    STANDING = 'standing', // 2.5 MET
    MANUAL = 'manual', // 3.5 MET
    HEAVY = 'heavy', // 5.0 MET
  }

  export enum ExerciseIntensity {
    LIGHT = 'light',
    MODERATE = 'moderate',
    VIGOROUS = 'vigorous'
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
    method: CalculationMethod;
    
    // Core (Used in both)
    age: string;
    sex: Sex | '';
    height: string; // cm
    weight: string; // kg
    primaryGoal: PrimaryGoal | '';
    goalIntensity?: GoalIntensity;

    // Basic Only
    activityLevel: ActivityLevel | ''; 

    // Advanced Only
    bodyFat?: string; // Optional percentage
    sleepHours?: string;
    jobActivity?: JobActivity | '';
    resistanceHours?: string; // Weekly hours
    resistanceIntensity?: ExerciseIntensity;
    cardioHours?: string; // Weekly hours
    cardioIntensity?: ExerciseIntensity;
  }
  
  export interface CalculatedGoals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }