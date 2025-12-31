// Supabase authentication for the server
// Validates JWTs and extracts user information

import { createClient } from '@supabase/supabase-js';

// Environment variables (set these in .env or environment)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return SUPABASE_URL && SUPABASE_ANON_KEY;
};

// Create Supabase client (only if configured)
let supabase = null;
if (isSupabaseConfigured()) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Extract and validate JWT from Authorization header
// Returns { user, error }
export const getAuthenticatedUser = async (req) => {
  // If Supabase is not configured, fall back to X-User-Id header (dev mode)
  if (!isSupabaseConfigured()) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return { user: null, error: 'Authentication required. Set X-User-Id header (dev mode).' };
    }
    // Return a mock user object for dev mode
    return {
      user: {
        id: userId,
        email: userId
      },
      error: null
    };
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify the JWT and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return { user: null, error: `Authentication failed: ${error.message}` };
    }

    if (!user) {
      return { user: null, error: 'Invalid token' };
    }

    return { user, error: null };
  } catch (e) {
    return { user: null, error: `Authentication error: ${e.message}` };
  }
};

// Express middleware for authentication
export const requireAuth = async (req, res, next) => {
  const { user, error } = await getAuthenticatedUser(req);

  if (error) {
    return res.status(401).json({ error });
  }

  // Attach user to request - use email as the userId for Dafny
  // (Supabase user.id is a UUID, but email is more human-readable)
  req.user = user;
  req.userId = user.email || user.id;

  next();
};

export { supabase };
