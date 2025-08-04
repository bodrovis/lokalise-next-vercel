// lib/get-translations.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      '[get-translations] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY env var'
    );
  }

  supabase = createClient(url, key);
  return supabase;
}

// cache: Map<locale, Map<namespace, T>>
const cache = new Map<string, Map<string, any>>();

export async function getTranslations<T extends Record<string, any>>(
  locale: string,
  namespace = 'default'
): Promise<T> {
  const lang = locale.trim().toLowerCase();
  const ns = namespace.trim().toLowerCase() || 'default';

  // init locale map if needed
  if (!cache.has(lang)) cache.set(lang, new Map());

  const localeCache = cache.get(lang)!;
  if (localeCache.has(ns)) {
    return localeCache.get(ns) as T;
  }

  const path = `locales/${lang}/${ns}.json`;
  let json: T = {} as T;

  try {
    const { data, error } = await getSupabaseClient()
      .storage
      .from('i18ndemo')
      .download(path);

    if (error) {
      // Supabase StorageApiError often has no `status` prop, but
      // error.cause (the underlying Response) *might* have a .status,
      // and error.message usually contains "not found" on 404s.
      const causeStatus = (error as any).cause?.status;
      const msg = error.message?.toLowerCase() ?? '';
      const isNotFound = causeStatus === 404 || msg.includes('not found');

      if (!isNotFound) {
        console.error(`[get-translations] Error downloading ${path}:`, error);
      }

      // cache empty object for missing or errored namespace
      localeCache.set(ns, json);
      return json;
    }

    const text = await data.text();
    try {
      json = JSON.parse(text) as T;
    } catch (e) {
      console.error(`[get-translations] Invalid JSON in ${path}:`, e);
      json = {} as T;
    }
  } catch (e) {
    console.error(`[get-translations] Unexpected error fetching ${path}:`, e);
  }

  localeCache.set(ns, json);
  return json;
}
