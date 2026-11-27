import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://lqzdochhwqqghekobjdu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_iP83PhH0tl8yrs2W3GcEwQ_MSgALnXY';

export function getSupabaseUrl(): string {
  return (
    String(import.meta.env.VITE_SUPABASE_URL || '').trim() ||
    DEFAULT_SUPABASE_URL
  );
}

export function getSupabaseKey(): string {
  return (
    String(
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        ''
    ).trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}

export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_KEY = getSupabaseKey();

export let supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

export let isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let initPromise: Promise<boolean> | null = null;

export async function ensureSupabaseReady(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const resp = await fetch('/api/supabase-config', { cache: 'no-store' });
      if (resp.ok) {
        const cfg = (await resp.json()) as {
          url?: string;
          key?: string;
          anonKey?: string;
        };
        const remoteUrl = String(cfg?.url || '').trim();
        const remoteKey = String(cfg?.key || cfg?.anonKey || '').trim();
        if (remoteUrl && remoteKey && (remoteUrl !== SUPABASE_URL || remoteKey !== SUPABASE_KEY)) {
          supabase = createClient(remoteUrl, remoteKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            realtime: { params: { eventsPerSecond: 10 } },
          });
        }
        isSupabaseConfigured = Boolean((remoteUrl || SUPABASE_URL) && (remoteKey || SUPABASE_KEY));
      }
    } catch {
      // Keep default/env client config cleanly
    }
    return isSupabaseConfigured;
  })();

  return initPromise;
}

export async function initSupabaseClient(): Promise<SupabaseClient> {
  await ensureSupabaseReady();
  return supabase;
}

export default supabase;
