import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initializes server-side Supabase client with Service Role Key (if present) or Anon Key
export function getSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY) are missing.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Authenticates user from Bearer token
export async function authenticateUserFromHeader(authHeader?: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = getSupabaseServerClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || 'Unauthorized user token' };
  }

  return { user, error: null };
}
