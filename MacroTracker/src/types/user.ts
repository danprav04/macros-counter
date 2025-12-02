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
  verification_email_sent_at?: string; // ISO date string, optional
  badges: Badge[];
  ad_streak_count: number;
  ads_watched_today: number;
  
  // Compliance & Liability Fields
  tos_agreed_at?: string;
  tos_version?: string;
  consent_health_data_at?: string;
  consent_data_transfer_at?: string;
  acknowledged_not_medical_device_at?: string;
  agreed_to_human_in_the_loop_at?: string;
}