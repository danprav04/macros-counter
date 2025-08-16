// src/types/user.ts
export interface Badge {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface User {
  client_id: string; // uuid
  email: string;
  coins: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string; // ISO date string
  badges: Badge[];
}