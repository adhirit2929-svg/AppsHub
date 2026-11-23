import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://lqzdochhwqqghekobjdu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_iP83PhH0tl8yrs2W3GcEwQ_MSgALnXY';

export function getSupabaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey(): string {
  return (
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}

export async function initSupabaseClient(): Promise<SupabaseClient> {
  let url = getSupabaseUrl();
  let key = getSupabaseKey();

  if (!import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const resp = await fetch('/api/supabase-config');
      if (resp.ok) {
        const cfg = (await resp.json()) as { url?: string; key?: string };
        if (cfg.url) url = cfg.url;
        if (cfg.key) key = cfg.key;
      }
    } catch {
      // fall back to defaults
    }
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_KEY = getSupabaseKey();

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

export default supabase;
