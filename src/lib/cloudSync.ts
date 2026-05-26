import { supabase } from "@/integrations/supabase/client";

/**
 * Cloud sync layer (Lovable Cloud).
 * Tabela `app_state` (PK composta: key + user_id, dados em jsonb).
 * Acesso restrito por RLS: cada usuário só vê os próprios dados.
 * Se não houver sessão, sync vira no-op (app funciona offline com localStorage).
 */

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function loadCloudState<T>(key: string): Promise<T | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("key", key)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn(`[cloudSync] load ${key} failed:`, error.message);
    return null;
  }
  return (data?.data as T) ?? null;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Upsert com debounce (500ms). Last write wins. No-op sem sessão. */
export function saveCloudState(key: string, data: unknown) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    timers.delete(key);
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from("app_state")
      .upsert(
        {
          key,
          user_id: userId,
          data: data as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key,user_id" }
      );
    if (error) console.warn(`[cloudSync] save ${key} failed:`, error.message);
  }, 500);
  timers.set(key, t);
}
