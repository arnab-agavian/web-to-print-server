import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const serverKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export const hasSupabaseAuth = Boolean(supabaseUrl && publishableKey);
export const hasSupabase = Boolean(
  supabaseUrl && serverKey,
);

// Create a fresh public client for each password/refresh operation so sessions
// cannot leak between concurrent Express requests.
export function createSupabaseAuthClient() {
  return hasSupabaseAuth
    ? createClient(supabaseUrl, publishableKey, clientOptions)
    : null;
}

export const supabaseAuth = createSupabaseAuthClient();
export const supabase = hasSupabase
  ? createClient(supabaseUrl, serverKey, clientOptions)
  : null;
