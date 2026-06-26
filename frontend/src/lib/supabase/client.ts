import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  if (!browserClient) {
    const { url, key } = getSupabaseBrowserEnv();
    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
