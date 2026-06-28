"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types/database";

const REQUEST_TIMEOUT_MS = 12000;
const SAFE_BUSINESS_COLUMNS = "id,user_id,name,business_type,description,opening_hours,timezone,after_hours_message,location,contact_info,website_url,whatsapp_number,is_active,onboarding_completed,created_at,updated_at";

function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
    }, REQUEST_TIMEOUT_MS);

    Promise.resolve(promise)
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function loadUserAndBusiness() {
      try {
        setLoading(true);
        const {
          data: { user: currentUser }
        } = await withTimeout(supabase.auth.getUser(), "Loading user session");

        if (!isMounted) return;

        setUser(currentUser);

        if (!currentUser) {
          setBusiness(null);
          return;
        }

        const businessResult = await withTimeout(
          Promise.resolve(
            supabase
              .from("businesses")
              .select(SAFE_BUSINESS_COLUMNS)
              .eq("user_id", currentUser.id)
              .maybeSingle()
          ),
          "Loading business profile"
        );
        const { data: businessRow, error: businessError } = businessResult;

        if (!isMounted) return;

        if (businessError) {
          throw businessError;
        }

        setBusiness((businessRow as Business | null) ?? null);
      } catch (error) {
        console.error("Failed to load user session:", error);
        if (!isMounted) return;
        setUser(null);
        setBusiness(null);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    loadUserAndBusiness();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      try {
        setLoading(true);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setBusiness(null);
          return;
        }

        const businessResult = await withTimeout(
          Promise.resolve(
            supabase
              .from("businesses")
              .select(SAFE_BUSINESS_COLUMNS)
              .eq("user_id", currentUser.id)
              .maybeSingle()
          ),
          "Refreshing business profile"
        );
        const { data: businessRow, error: businessError } = businessResult;

        if (!isMounted) return;

        if (businessError) {
          throw businessError;
        }

        setBusiness((businessRow as Business | null) ?? null);
      } catch (error) {
        console.error("Failed to refresh user session:", error);
        if (!isMounted) return;
        setUser(null);
        setBusiness(null);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, business };
}
