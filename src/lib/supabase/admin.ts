import { createClient, SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<any, "public", any>;

let cachedAdminClient: AdminClient | null = null;

function getRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  cachedAdminClient = createClient(getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedAdminClient;
}

export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdminClient(), prop, receiver);
  }
});
