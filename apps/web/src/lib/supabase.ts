import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Reject userinfo (e.g., https://evil.com@localhost)
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol === 'https:') return true;
    // Allow plain HTTP only for local development
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isConfigured(): boolean {
  return isValidUrl(supabaseUrl) && supabaseAnonKey.length > 0;
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
      },
    });
  }
  return client;
}
