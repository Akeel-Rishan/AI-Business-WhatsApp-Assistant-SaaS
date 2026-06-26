export interface Business {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  opening_hours: string | null;
  location: string | null;
  contact_info: string | null;
  whatsapp_number: string | null;
  whatsapp_phone_id: string | null;
  whatsapp_access_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  whatsapp_number: string;
  name: string | null;
  email: string | null;
  first_seen: string;
  last_seen: string;
  message_count: number;
}

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string;
  status: "active" | "closed" | "human_handoff";
  started_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  business_id: string;
  direction: "inbound" | "outbound";
  content: string;
  message_type: string;
  wa_message_id: string | null;
  sent_by_ai: boolean;
  created_at: string;
}

export interface FAQ {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  created_at: string;
}

export interface KnowledgeBaseItem {
  id: string;
  business_id: string;
  category: "product" | "service" | "policy" | "general" | null;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  customer_id: string | null;
  inquiry_type: string | null;
  summary: string | null;
  status: "new" | "contacted" | "converted" | "lost";
  created_at: string;
}

export interface AISettings {
  id: string;
  business_id: string;
  is_enabled: boolean;
  tone: "friendly" | "formal" | "casual";
  language: string;
  custom_instructions: string | null;
  fallback_message: string;
  created_at: string;
}
