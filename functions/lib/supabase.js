import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(env) {
  if (!env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL belum dikonfigurasi");
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi");
  }

  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
}