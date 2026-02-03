import { createClient } from '@supabase/supabase-js';

// Helper to access environment variables in different environments (Vite/Next/Create-React-App)
// On Vercel with Vite, variables must start with VITE_ to be exposed to the client.
const getEnvVar = (key: string) => {
  // Check import.meta.env (Vite standard)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  // Check process.env (Node/Webpack standard)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Fallback for Vercel System variables or direct process.env access
  if (typeof process !== 'undefined' && process.env) {
      // Try to find it without VITE_ prefix if strictly needed
      const rawKey = key.replace('VITE_', '');
      if (process.env[rawKey]) return process.env[rawKey];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseKey;
}

// Create a single supabase client for interacting with your database
export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseKey)
    : { 
        // Mock client to prevent crashes if imported but not configured
        from: () => ({ 
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
            insert: () => Promise.resolve({ error: null }),
            upsert: () => Promise.resolve({ error: null })
        }) 
      } as any;