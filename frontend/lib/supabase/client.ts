import { createBrowserClient } from '@supabase/ssr';

// Create a single global client instance to avoid lock conflicts
// This is initialized once when the module is first imported
const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export function createClient() {
  return supabaseClient;
}
