"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessInstructions, FAQ, KnowledgeBaseItem, KnowledgeOverview } from "@/types/database";

interface ApiKnowledgeOverview {
  total_faqs: number;
  active_faqs: number;
  inactive_faqs: number;
  total_items: number;
  items_by_category: Record<string, number>;
  instructions_filled_count: number;
  has_assistant_name: boolean;
  has_personality: boolean;
  has_greeting: boolean;
  has_escalation_message: boolean;
  has_name: boolean;
  has_description: boolean;
  has_hours: boolean;
  has_contact: boolean;
  has_location: boolean;
  has_whatsapp: boolean;
  readiness_score: number;
  recent_faqs: FAQ[];
  recent_items: KnowledgeBaseItem[];
  warnings: string[];
  faqs: FAQ[];
  items: KnowledgeBaseItem[];
  instructions: BusinessInstructions;
}

interface UseKnowledgeBaseOverviewReturn {
  overview: KnowledgeOverview | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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

async function request<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<T>;
}

function toKnowledgeOverview(data: ApiKnowledgeOverview): KnowledgeOverview {
  return {
    totalFaqs: data.total_faqs,
    activeFaqs: data.active_faqs,
    inactiveFaqs: data.inactive_faqs,
    totalItems: data.total_items,
    itemsByCategory: data.items_by_category,
    instructionsFilledCount: data.instructions_filled_count,
    hasAssistantName: data.has_assistant_name,
    hasPersonality: data.has_personality,
    hasGreeting: data.has_greeting,
    hasEscalationMessage: data.has_escalation_message,
    hasName: data.has_name,
    hasDescription: data.has_description,
    hasHours: data.has_hours,
    hasContact: data.has_contact,
    hasLocation: data.has_location,
    hasWhatsapp: data.has_whatsapp,
    readinessScore: data.readiness_score,
    recentFaqs: data.recent_faqs,
    recentItems: data.recent_items,
    warnings: data.warnings,
    faqs: data.faqs,
    items: data.items,
    instructions: data.instructions
  };
}

export function useKnowledgeBaseOverview(businessId?: string | null): UseKnowledgeBaseOverviewReturn {
  const [overview, setOverview] = useState<KnowledgeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!businessId) {
      setOverview(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ business_id: businessId });
      const data = await request<ApiKnowledgeOverview>(`/api/v1/knowledge/overview?${params.toString()}`);
      setOverview(toKnowledgeOverview(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load knowledge base overview.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { overview, loading, error, refetch };
}
