"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types/database";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function loadUserAndBusiness() {
      setLoading(true);
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      setUser(currentUser);

      if (!currentUser) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      const { data: businessRow } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!isMounted) return;

      setBusiness((businessRow as Business | null) ?? null);
      setLoading(false);
    }

    loadUserAndBusiness();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      const { data: businessRow } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!isMounted) return;

      setBusiness((businessRow as Business | null) ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, business };
}
