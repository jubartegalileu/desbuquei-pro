import { createClient } from '@supabase/supabase-js';

// HELPER: Safe access to environment variables
// Handles Vite (import.meta.env) and standard (process.env)
// Prevents crashes if import.meta.env is undefined at runtime
export const getEnvVar = (key: string) => {
    let value = '';

    // 1. Try Vite's import.meta.env with safe access
    try {
        // We check existence before access to prevent "Cannot read properties of undefined"
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // Explicitly handle keys to allow Vite's static replacement to work
            if (key === 'VITE_SUPABASE_URL') {
                // @ts-ignore
                value = import.meta.env.VITE_SUPABASE_URL;
            } else if (key === 'VITE_SUPABASE_ANON_KEY') {
                // @ts-ignore
                value = import.meta.env.VITE_SUPABASE_ANON_KEY;
            } else if (key === 'VITE_API_KEY' || key === 'API_KEY') {
                // @ts-ignore
                value = import.meta.env.VITE_API_KEY;
            } else {
                // Dynamic access fallback
                // @ts-ignore
                value = import.meta.env[key];
            }
        }
    } catch (e) {
        // Ignore errors during access
    }

    if (value) return value;

    // 2. Fallback to process.env (Node/Webpack/Legacy)
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch (e) {
        // Ignore
    }

    return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

console.log('=== SUPABASE CONFIG ===');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Carregada' : '❌ NÃO carregada');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Carregada' : '❌ NÃO carregada');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Carregada' : '❌ NÃO carregada');
console.log('URL valor:', supabaseUrl);
console.log('KEY valor:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'vazio');

export const isSupabaseConfigured = () => {
    const configured = !!supabaseUrl && !!supabaseKey;
    console.log('isSupabaseConfigured():', configured ? '✅ SIM' : '❌ NÃO');
    return configured;
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

// Admin client with service role key for bypassing RLS
export const supabaseAdmin = isSupabaseConfigured() && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase;