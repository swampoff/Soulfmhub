import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Get Supabase credentials from environment variables or fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey;

// Extract project ID from URL for API Base
const getProjectIdFromUrl = (url: string): string => {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : projectId;
};

// API Base URL for server endpoints
export const API_BASE = `${supabaseUrl}/functions/v1/make-server-06086aa3`;

// Singleton Supabase client instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();