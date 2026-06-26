"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessInstructions } from "@/types/database";

interface UseInstructionsReturn {
  instructions: BusinessInstructions | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  saving: boolean;
  updateField: <K extends keyof BusinessInstructions>(field: K, value: BusinessInstructions[K]) => void;
  saveInstructions: () => Promise<void>;
  resetToSaved: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type InstructionsSavePayload = Partial<
  Pick<
    BusinessInstructions,
    | "assistant_name"
    | "personality_description"
    | "conversation_opener"
    | "always_do_rules"
    | "never_do_rules"
    | "restricted_topics"
    | "redirect_message"
    | "escalation_keyword"
    | "escalation_situations"
    | "escalation_message"
    | "max_response_length"
    | "use_emojis"
    | "use_bullet_points"
    | "conversation_closer"
    | "after_hours_message"
    | "response_language"
  >
>;

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  return session.access_token;
}

async function parseApiError(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item: { msg?: string }) => item.msg ?? "Validation error")
        .join(", ");
    }
  } catch {
    return response.statusText || "Request failed.";
  }

  return response.statusText || "Request failed.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<T>;
}

function toSavePayload(instructions: BusinessInstructions): InstructionsSavePayload {
  return {
    assistant_name: instructions.assistant_name,
    personality_description: instructions.personality_description,
    conversation_opener: instructions.conversation_opener,
    always_do_rules: instructions.always_do_rules.filter((rule) => rule.trim()),
    never_do_rules: instructions.never_do_rules.filter((rule) => rule.trim()),
    restricted_topics: instructions.restricted_topics.filter((topic) => topic.trim()),
    redirect_message: instructions.redirect_message,
    escalation_keyword: instructions.escalation_keyword,
    escalation_situations: instructions.escalation_situations.filter((rule) => rule.trim()),
    escalation_message: instructions.escalation_message,
    max_response_length: instructions.max_response_length,
    use_emojis: instructions.use_emojis,
    use_bullet_points: instructions.use_bullet_points,
    conversation_closer: instructions.conversation_closer,
    after_hours_message: instructions.after_hours_message,
    response_language: instructions.response_language
  };
}

function stable(value: unknown) {
  return JSON.stringify(value);
}

export function useInstructions(businessId?: string | null): UseInstructionsReturn {
  const [instructions, setInstructions] = useState<BusinessInstructions | null>(null);
  const [savedInstructions, setSavedInstructions] = useState<BusinessInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchInstructions() {
      if (!businessId) {
        setInstructions(null);
        setSavedInstructions(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ business_id: businessId });
        const data = await request<BusinessInstructions>(`/api/v1/knowledge/instructions?${params.toString()}`);
        if (cancelled) return;
        setInstructions(data);
        setSavedInstructions(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load AI instructions.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInstructions();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const isDirty = useMemo(() => {
    if (!instructions || !savedInstructions) return false;
    return stable(toSavePayload(instructions)) !== stable(toSavePayload(savedInstructions));
  }, [instructions, savedInstructions]);

  const updateField = useCallback(
    <K extends keyof BusinessInstructions>(field: K, value: BusinessInstructions[K]) => {
      setInstructions((current) => (current ? { ...current, [field]: value } : current));
    },
    []
  );

  const saveInstructions = useCallback(async () => {
    if (!businessId || !instructions) return;

    setSaving(true);
    setError(null);

    try {
      const params = new URLSearchParams({ business_id: businessId });
      const saved = await request<BusinessInstructions>(`/api/v1/knowledge/instructions?${params.toString()}`, {
        method: "PUT",
        body: JSON.stringify(toSavePayload(instructions))
      });
      setInstructions(saved);
      setSavedInstructions(saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save AI instructions.";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [businessId, instructions]);

  const resetToSaved = useCallback(() => {
    setInstructions(savedInstructions);
    setError(null);
  }, [savedInstructions]);

  return {
    instructions,
    loading,
    error,
    isDirty,
    saving,
    updateField,
    saveInstructions,
    resetToSaved
  };
}
