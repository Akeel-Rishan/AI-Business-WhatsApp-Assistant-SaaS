"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FAQ, FAQCreate, FAQUpdate } from "@/types/database";

interface UseFAQsReturn {
  faqs: FAQ[];
  loading: boolean;
  error: string | null;
  addFAQ: (data: FAQCreate) => Promise<void>;
  updateFAQ: (id: string, data: FAQUpdate) => Promise<void>;
  deleteFAQ: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
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

export function useFAQs(businessId?: string | null): UseFAQsReturn {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!businessId) {
      setFaqs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ business_id: businessId });
      const data = await request<FAQ[]>(`/api/v1/knowledge/faqs?${params.toString()}`);
      setFaqs(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load FAQs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addFAQ = useCallback(async (data: FAQCreate) => {
    const created = await request<FAQ>("/api/v1/knowledge/faqs", {
      method: "POST",
      body: JSON.stringify(data)
    });
    setFaqs((current) => [created, ...current]);
  }, []);

  const updateFAQ = useCallback(async (id: string, data: FAQUpdate) => {
    const updated = await request<FAQ>(`/api/v1/knowledge/faqs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
    setFaqs((current) => current.map((faq) => (faq.id === id ? updated : faq)));
  }, []);

  const deleteFAQ = useCallback(async (id: string) => {
    const previous = faqs;
    setFaqs((current) => current.filter((faq) => faq.id !== id));

    try {
      await request<{ success: boolean }>(`/api/v1/knowledge/faqs/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      setFaqs(previous);
      throw err;
    }
  }, [faqs]);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    const previous = faqs;
    setFaqs((current) => current.map((faq) => (faq.id === id ? { ...faq, is_active: isActive } : faq)));

    try {
      const updated = await request<FAQ>(`/api/v1/knowledge/faqs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive })
      });
      setFaqs((current) => current.map((faq) => (faq.id === id ? updated : faq)));
    } catch (err) {
      setFaqs(previous);
      throw err;
    }
  }, [faqs]);

  return { faqs, loading, error, addFAQ, updateFAQ, deleteFAQ, toggleActive, refetch };
}
