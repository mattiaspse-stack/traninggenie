import { createClient, type User } from "@supabase/supabase-js";

export async function getSupabaseUser(request: Request): Promise<User | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}
