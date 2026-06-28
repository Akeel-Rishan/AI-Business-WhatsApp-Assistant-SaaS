"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ConnectionTestResult,
  WhatsAppCredentialsInput,
  WhatsAppStatus
} from "@/types/database";

export type ConnectionStatus = "connected" | "disconnected" | "error";

export interface WhatsAppConnectionState {
  status: ConnectionStatus;
  whatsappNumber: string | null;
  phoneNumberIdPreview: string | null;
  aiEnabled: boolean;
  connectedSince: string | null;
  testResult: ConnectionTestResult | null;
  testing: boolean;
  saving: boolean;
  disconnecting: boolean;
}

interface UseWhatsAppConnectionReturn {
  connection: WhatsAppConnectionState;
  loading: boolean;
  error: string | null;
  saveCredentials: (data: WhatsAppCredentialsInput) => Promise<void>;
  testConnection: () => Promise<ConnectionTestResult>;
  disconnect: () => Promise<void>;
  setAiEnabled: (enabled: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
const CONNECTION_CHANGED_EVENT = "whatsapp-connection-changed";

const initialConnection: WhatsAppConnectionState = {
  status: "disconnected",
  whatsappNumber: null,
  phoneNumberIdPreview: null,
  aiEnabled: false,
  connectedSince: null,
  testResult: null,
  testing: false,
  saving: false,
  disconnecting: false
};

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") return payload.detail;
  } catch {
    // Fall through to the HTTP status text.
  }
  return response.statusText || "Request failed.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers
    }
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<T>;
}

export function useWhatsAppConnection(businessId?: string | null): UseWhatsAppConnectionReturn {
  const [connection, setConnection] = useState<WhatsAppConnectionState>(initialConnection);
  const [loading, setLoading] = useState(Boolean(businessId));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!businessId) {
      setConnection(initialConnection);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const status = await request<WhatsAppStatus>(`/api/v1/whatsapp/status?business_id=${encodeURIComponent(businessId)}`);
      setConnection((current) => ({
        ...current,
        status: status.is_connected ? "connected" : "disconnected",
        whatsappNumber: status.whatsapp_number,
        phoneNumberIdPreview: status.phone_number_id_preview,
        aiEnabled: status.ai_enabled,
        connectedSince: status.connected_since,
        testResult: status.test_result ?? current.testResult
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load WhatsApp connection.";
      setError(message);
      setConnection((current) => ({ ...current, status: "error" }));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const refresh = () => void refetch();
    window.addEventListener(CONNECTION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CONNECTION_CHANGED_EVENT, refresh);
  }, [refetch]);

  const saveCredentials = useCallback(async (data: WhatsAppCredentialsInput) => {
    setConnection((current) => ({ ...current, saving: true }));
    setError(null);
    try {
      await request("/api/v1/whatsapp/credentials", {
        method: "POST",
        body: JSON.stringify(data)
      });
      setConnection((current) => ({
        ...current,
        whatsappNumber: data.whatsapp_number,
        phoneNumberIdPreview: data.whatsapp_phone_id.slice(-6),
        testResult: null
      }));
      window.dispatchEvent(new Event(CONNECTION_CHANGED_EVENT));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save credentials.";
      setError(message);
      throw err;
    } finally {
      setConnection((current) => ({ ...current, saving: false }));
    }
  }, []);

  const testConnection = useCallback(async () => {
    if (!businessId) throw new Error("Business profile is required.");
    setConnection((current) => ({ ...current, testing: true, testResult: null }));
    setError(null);
    try {
      const result = await request<ConnectionTestResult>("/api/v1/whatsapp/test-connection", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId })
      });
      setConnection((current) => ({
        ...current,
        status: result.overall_success ? "connected" : "error",
        whatsappNumber: result.phone_number ?? current.whatsappNumber,
        testResult: result
      }));
      if (result.overall_success) await refetch();
      if (result.overall_success) window.dispatchEvent(new Event(CONNECTION_CHANGED_EVENT));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection test failed.";
      setError(message);
      setConnection((current) => ({ ...current, status: "error" }));
      throw err;
    } finally {
      setConnection((current) => ({ ...current, testing: false }));
    }
  }, [businessId, refetch]);

  const disconnect = useCallback(async () => {
    if (!businessId) throw new Error("Business profile is required.");
    setConnection((current) => ({ ...current, disconnecting: true }));
    setError(null);
    try {
      await request(`/api/v1/whatsapp/credentials?business_id=${encodeURIComponent(businessId)}`, { method: "DELETE" });
      setConnection({ ...initialConnection, whatsappNumber: connection.whatsappNumber });
      window.dispatchEvent(new Event(CONNECTION_CHANGED_EVENT));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not disconnect WhatsApp.";
      setError(message);
      throw err;
    } finally {
      setConnection((current) => ({ ...current, disconnecting: false }));
    }
  }, [businessId, connection.whatsappNumber]);

  const setAiEnabled = useCallback(async (enabled: boolean) => {
    if (!businessId) throw new Error("Business profile is required.");
    const previous = connection.aiEnabled;
    setConnection((current) => ({ ...current, aiEnabled: enabled }));
    try {
      const result = await request<{ is_enabled: boolean }>("/api/v1/whatsapp/ai-enabled", {
        method: "PATCH",
        body: JSON.stringify({ business_id: businessId, is_enabled: enabled })
      });
      setConnection((current) => ({ ...current, aiEnabled: result.is_enabled }));
      window.dispatchEvent(new Event(CONNECTION_CHANGED_EVENT));
    } catch (err) {
      setConnection((current) => ({ ...current, aiEnabled: previous }));
      throw err;
    }
  }, [businessId, connection.aiEnabled]);

  return { connection, loading, error, saveCredentials, testConnection, disconnect, setAiEnabled, refetch };
}
