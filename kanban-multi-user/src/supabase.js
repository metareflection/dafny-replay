// Supabase client for the frontend
import { createClient } from '@supabase/supabase-js';

// Get Supabase config from environment variables (set in .env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return SUPABASE_URL && SUPABASE_ANON_KEY;
};

// Create Supabase client (only if configured)
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Get current session
export const getSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Get access token for API requests
export const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token || null;
};

// Sign in with email/password
export const signIn = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

// Sign up with email/password
export const signUp = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
};

// Sign in with Google
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};
