"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ItemCategory,
  KnowledgeBaseItem,
  KnowledgeBaseItemCreate,
  KnowledgeBaseItemUpdate
} from "@/types/database";

type CategoryFilter = "all" | ItemCategory;

interface UseKnowledgeBaseItemsReturn {
  items: KnowledgeBaseItem[];
  filteredItems: KnowledgeBaseItem[];
  loading: boolean;
  error: string | null;
  activeCategory: string;
  searchQuery: string;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  addItem: (data: KnowledgeBaseItemCreate) => Promise<void>;
  updateItem: (id: string, data: KnowledgeBaseItemUpdate) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  refetch: () => Promise<void>;
  stats: {
    total: number;
    products: number;
    services: number;
    pricing: number;
    policies: number;
    delivery: number;
    general: number;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const CATEGORY_FILTERS = new Set(["all", "product", "service", "pricing", "policy", "delivery", "general"]);

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

export function useKnowledgeBaseItems(businessId?: string | null): UseKnowledgeBaseItemsReturn {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const updateActiveCategory = useCallback((category: string) => {
    setActiveCategory(CATEGORY_FILTERS.has(category) ? (category as CategoryFilter) : "all");
  }, []);

  const refetch = useCallback(async () => {
    if (!businessId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ business_id: businessId });
      const data = await request<KnowledgeBaseItem[]>(`/api/v1/knowledge/items?${params.toString()}`);
      setItems(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load knowledge base items.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        !normalizedQuery ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.content.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, items, searchQuery]);

  const stats = useMemo(() => ({
    total: items.length,
    products: items.filter((item) => item.category === "product").length,
    services: items.filter((item) => item.category === "service").length,
    pricing: items.filter((item) => item.category === "pricing").length,
    policies: items.filter((item) => item.category === "policy").length,
    delivery: items.filter((item) => item.category === "delivery").length,
    general: items.filter((item) => item.category === "general").length
  }), [items]);

  const addItem = useCallback(async (data: KnowledgeBaseItemCreate) => {
    const created = await request<KnowledgeBaseItem>("/api/v1/knowledge/items", {
      method: "POST",
      body: JSON.stringify(data)
    });
    setItems((current) => [created, ...current]);
  }, []);

  const updateItem = useCallback(async (id: string, data: KnowledgeBaseItemUpdate) => {
    const updated = await request<KnowledgeBaseItem>(`/api/v1/knowledge/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
    setItems((current) => current.map((item) => (item.id === id ? updated : item)));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      await request<{ success: boolean }>(`/api/v1/knowledge/items/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      setItems(previous);
      throw err;
    }
  }, [items]);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    const previous = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_active: isActive } : item)));

    try {
      const updated = await request<KnowledgeBaseItem>(`/api/v1/knowledge/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive })
      });
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setItems(previous);
      throw err;
    }
  }, [items]);

  return {
    items,
    filteredItems,
    loading,
    error,
    activeCategory,
    searchQuery,
    setActiveCategory: updateActiveCategory,
    setSearchQuery,
    addItem,
    updateItem,
    deleteItem,
    toggleActive,
    refetch,
    stats
  };
}
