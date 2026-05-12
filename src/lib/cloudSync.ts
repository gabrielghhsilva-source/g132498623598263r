import { supabase } from "@/integrations/supabase/client";

/**
 * Cloud sync layer (Lovable Cloud).
 * Uses table `app_state` (key text PK, data jsonb) to mirror app state.
 * Public access — chosen mode for this project.
 */

export async function loadCloudState<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.warn(`[cloudSync] load ${key} failed:`, error.message);
    return null;
  }
  return (data?.data as T) ?? null;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Debounced upsert (500ms). Last write wins. */
export function saveCloudState(key: string, data: unknown) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    timers.delete(key);
    const { error } = await supabase
      .from("app_state")
      .upsert({ key, data: data as any, updated_at: new Date().toISOString() });
    if (error) console.warn(`[cloudSync] save ${key} failed:`, error.message);
  }, 500);
  timers.set(key, t);
}
