import "server-only";
import { createClient } from "@supabase/supabase-js";
export function db() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configure Supabase in .env.local to use your private notebook.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
